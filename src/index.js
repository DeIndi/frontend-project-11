import 'bootstrap';
import * as yup from 'yup';
import onChange from 'on-change';
import i18n from 'i18next';
import axios from 'axios';
import _ from 'lodash';
import resources from './locales/locale.js';
import renderView from './view.js';
import './index.scss';

const schema = yup.string().trim().url().required();

const validate = (url) => schema.validate(url, { abortEarly: false });

const proxyLink = (link) => `https://allorigins.hexlet.app/get?url=${encodeURIComponent(link)}&disableCache=true`;

const parseRss = (data) => {
  const parser = new DOMParser();
  const rssDOM = parser.parseFromString(data.contents, 'text/xml');
  const errorNode = rssDOM.querySelector('parsererror');
  if (errorNode) {
    console.log('parsing error');
    throw new Error('Incorrect document type');
  }
  const channel = rssDOM.querySelector('channel');
  const title = rssDOM.querySelector('title');
  const desc = rssDOM.querySelector('description');
  const feedId = _.uniqueId();
  const items = channel.querySelectorAll('item');
  const posts = [...items].map((item) => ({
    feedId,
    postId: _.uniqueId(),
    title: item.querySelector('title').textContent,
    description: item.querySelector('description').textContent,
    postLink: item.querySelector('link').textContent,
  }));
  return {
    title, feedId, desc, posts,
  };
};

const feedIsNew = (link, state) => state.feeds.filter((f) => f.link === link).length === 0;

const loadFeed = (link, state) => {
  state.loadingProcess.status = 'loading';
  return axios.get(proxyLink(link))
    .then((response) => {
      if (response.data) {
        const {
          title, feedId, desc, posts,
        } = parseRss(response.data, state);
        if (feedIsNew(link, state)) {
          state.feeds.push({
            feedId, title: title.textContent, desc: desc.textContent, link,
          });
        }
        posts.forEach((post) => {
          if (!state.posts.find((oldPost) => oldPost.postLink === post.postLink)) {
            state.posts.push(post);
          }
        });
        state.form.isValid = true;
        state.form.feedbackMessage = 'feedbackPositive';
        state.loadingProcess.status = 'success';
      } else {
        state.form.isValid = false;
        state.form.feedbackMessage = 'errorNoValidRSS';
        state.loadingProcess.status = 'fail';
        throw new Error("Can't be loaded!");
      }
    })
    .catch((error) => {
      state.form.isValid = false;
      console.log('error', error);
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' || error.code === 'ERR_NETWORK') {
        state.form.feedbackMessage = 'errorNetworkError';
      } else {
        state.form.feedbackMessage = 'errorNoValidRss';
      }
      state.loadingProcess.status = 'fail';
      throw (error);
    });
};

const updateFeed = (link, state) => axios.get(proxyLink(link))
  .then((response) => {
    if (response.data) return response.data;
    throw new Error("Can't be loaded!");
  })
  .catch((error) => {
    throw (error);
  })
  .then((data) => {
    if (!data.contents) {
      return;
    }
    try {
      const {
        posts,
      } = parseRss(data, state);
      posts.forEach((post) => {
        if (!state.posts.find((oldPost) => oldPost.postLink === post.postLink)) {
          state.posts.push(post);
        }
      });
    } catch (error) {
      console.log(error);
    }
  });

const startRegularUpdate = (state) => {
  const checkFeeds = () => {
    const resultFeeds = state.feeds.map((feed) => updateFeed(feed.link, state));
    return Promise.allSettled(resultFeeds)
      .then(() => {
        setTimeout(checkFeeds, 5000);
      })
      .catch((e) => console.log('Error while checking feeds: ', e));
  };
  return checkFeeds();
};

const main = () => {
  const elements = {
    innerHeader: document.querySelector('h1'),
    announcementP: document.querySelector('.lead'),
    form: document.querySelector('form'),
    formInput: document.getElementById('url-input'),
    formSubmit: document.querySelector('button[type="submit"]'),
    feedbackMessage: document.querySelector('.feedback'),
    feeds: document.querySelector('.feeds'),
    feedsHeader: document.querySelector('.feeds').querySelector('.h4'),
    feedsTitle: document.querySelector('.feeds').querySelector('.h6'),
    feedsDescription: document.querySelector('.feeds').querySelector('.text-black-50'),
    posts: document.querySelector('.posts'),
    fullArticle: document.querySelector('.full-article'),
    modalHeader: document.querySelector('.modal-header'),
    modalBody: document.querySelector('.modal-body'),
  };
  const state = {
    language: 'en',
    loadingProcess: {
      status: 'idle',
    },
    form: {
      data: '',
      lastFeed: '',
      feedbackMessage: null,
      isValid: false,
    },
    modal: {
      activePostId: null,
    },
    feeds: [],
    posts: [],
    uiState: {
      posts: [],
    },
  };
  const i18Inst = i18n.createInstance();
  i18Inst.init({ resources, lng: 'ru' })
    .then(() => {
      const watchedState = onChange(state, renderView(state, i18Inst, elements));
      elements.formInput.addEventListener('input', (e) => {
        e.preventDefault();
        watchedState.form.data = e.target.value;
      });
      elements.form.addEventListener('submit', (e) => {
        e.preventDefault();
        validate(watchedState.form.data)
          .then(() => {
            if (!feedIsNew(watchedState.form.data, watchedState)) {
              watchedState.form.isValid = false;
              watchedState.form.feedbackMessage = 'feedbackAlreadyExists';
              elements.formInput.value = '';
              return;
            }
            watchedState.loadingProcess.status = 'loading';
            loadFeed(watchedState.form.data, watchedState)
              .then(() => {
                watchedState.loadingProcess.status = 'idle';
                elements.formInput.value = '';
                watchedState.form.data = '';
              })
              .catch(() => {
                watchedState.form.isValid = false;
                watchedState.loadingProcess.status = 'fail';
                elements.formInput.value = '';
                watchedState.form.data = '';
              });
          })
          .catch(() => {
            watchedState.form = { data: '', feedbackMessage: 'errorNotValidUrl', isValid: false };
            watchedState.loadingProcess.status = 'fail';
            elements.formInput.value = '';
          });
      });
      startRegularUpdate(watchedState);
    })
    .catch((error) => console.error(error));
};

main();
