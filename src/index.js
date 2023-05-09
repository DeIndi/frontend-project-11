import 'bootstrap';
import * as yup from 'yup';
import onChange from 'on-change';
import i18n from 'i18next';
import axios from 'axios';
import _ from 'lodash';
import resources from './locales/locale.js';
import watch from './view.js';
import './index.scss';

let schema = yup.string().trim().required().url();

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
  const items = channel.querySelectorAll('item');
  const posts = [...items].map((item) => ({
    postId: _.uniqueId(),
    title: item.querySelector('title').textContent,
    description: item.querySelector('description').textContent,
    postLink: item.querySelector('link').textContent,
  }));
  return {
    title, desc, posts,
  };
};

const changeActivePost = (state, postId) => {
  state.modal.activePostId = postId;
};

const setPostAsViewed = (state, id) => {
  state.uiState.posts[id] = 'viewed';
};

const handlePostClick = (state, renderedPost) => {
  changeActivePost(state, renderedPost.getAttribute('id'));
  setPostAsViewed(state, renderedPost.getAttribute('id'));
};

const controlActivePost = (state) => {
  const renderedPosts = document.querySelectorAll('.post-item');
  console.log('rendered posts: ', renderedPosts);
  if (renderedPosts.length > 0) {
    renderedPosts.forEach((renderedPost) => {
      renderedPost.querySelector('button').addEventListener('click', () => {
        handlePostClick(state, renderedPost);
      });
      renderedPost.querySelector('a').addEventListener('click', () => {
        handlePostClick(state, renderedPost);
      });
    });
  }
};

const loadFeed = (link, state) => {
  state.loadingProcess.status = 'loading';
  return axios.get(proxyLink(link))
    .then((response) => {
      if (response.data) {
        const {
          title, desc, posts,
        } = parseRss(response.data, state);
        const feedId = _.uniqueId();
        state.feeds.push({
          feedId, title: title.textContent, desc: desc.textContent, link,
        });
        schema = yup.string().trim().required().url()
          .notOneOf(state.feeds.map((f) => f.link));
        state.posts.push(...posts);
        controlActivePost(state);
        state.form.isValid = true;
        state.form.feedbackMessage = 'feedbackPositive';
        state.loadingProcess.status = 'success';
      } else {
        state.form.isValid = false;
        state.form.feedbackMessage = 'errorNoValidRss';
        state.loadingProcess.status = 'fail';
        throw new Error("Can't be loaded!");
      }
    })
    .catch((error) => {
      state.form.isValid = false;
      console.log('error', error);
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' || error.code === 'ERR_NETWORK') {
        state.form.feedbackMessage = 'errorNetwork';
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
      } = parseRss(data);
      state.posts = [...state.posts, ...posts.filter(
        (post) => !state.posts.find((oldPost) => oldPost.postLink === post.postLink),
      )];
      controlActivePost(state);
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
      // watch - точка входа в слой view
      // const watchedState = watch(state, i18Inst, elements);
      // onChange внутри watch в view.js
      const watchedState = onChange(state, watch(state, i18Inst, elements));
      elements.formInput.addEventListener('input', (e) => {
        e.preventDefault();
        watchedState.form.data = e.target.value;
      });
      elements.form.addEventListener('submit', (e) => {
        e.preventDefault();
        validate(watchedState.form.data)
          .then(() => {
            watchedState.loadingProcess.status = 'loading';
            loadFeed(watchedState.form.data, watchedState)
              .then(() => {
                watchedState.loadingProcess.status = 'idle';
                elements.formInput.value = '';
                watchedState.form.data = '';
                // вернуть фокус
              })
              .catch((err) => {
                console.log('validation err: ', err);
                watchedState.form.isValid = false;
                watchedState.loadingProcess.status = 'fail';
                elements.formInput.value = '';
                watchedState.form.data = '';
              });
          })
          .catch((error) => {
            watchedState.form.feedbackMessage = 'errorNotValidUrl';
            if (error.message.startsWith('this must not be one of')) {
              watchedState.form.feedbackMessage = 'errorAlreadyExists';
            }
            if (!watchedState.form.data) {
              watchedState.form.feedbackMessage = 'errorEmptyInput';
            }
            watchedState.form.data = '';
            watchedState.form.isValid = false;
            watchedState.loadingProcess.status = 'fail';
            elements.formInput.value = '';
          });
      });
      startRegularUpdate(watchedState);
    })
    .catch((error) => console.error(error));

};

main();
