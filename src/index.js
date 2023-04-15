import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as yup from 'yup';
import onChange from 'on-change';
import i18n from 'i18next';
import axios from 'axios';
import _ from 'lodash';
import resources from './locales/locale.js';
import view from './view.js';

const schema = yup.string().trim().required();

const validate = (url) => schema.validate(url, { abortEarly: false });

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

// локальный прокси-сервер all origins
const parseRss = (data, state) => {
  const parser = new DOMParser();
  const rssDOM = parser.parseFromString(data.contents, 'text/xml');
  const errorNode = rssDOM.querySelector('parsererror');
  if (errorNode) {
    throw new Error('Incorrect document type');
  }
  const channel = rssDOM.querySelector('channel');
  const title = rssDOM.querySelector('title');
  const desc = rssDOM.querySelector('description');
  state.currentFeedTitle = title.textContent;
  state.currentFeedDesc = desc.textContent;
  const feedId = _.uniqueId();
  console.log('DOM: ', rssDOM);
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

const loadFeed = (link, state) => axios.get(`https://allorigins.hexlet.app/get?url=${encodeURIComponent(link)}&disableCache=true`)
  .then((response) => {
    console.log('response: ', response);
    if (response.data) return response.data;
    state.form.isValid = false;
    state.form.feedbackMessage = 'feedbackNegative';
    throw new Error("Can't be loaded!");
  })
  .catch((error) => {
    state.form.feedbackMessage = error;
    throw (error);
  })
  .then((data) => {
    if (!data.contents) {
      state.form.isValid = false;
      state.form.feedbackMessage = 'feedbackNegative';
      return;
    }
    try {
      const {
        title, feedId, desc, posts,
      } = parseRss(data, state);
      if (state.feeds.filter((feed) => feed.link === link).length === 0) {
        state.feeds.push({
          feedId, title: title.textContent, desc: desc.textContent, link,
        });
        state.form.isValid = true;
        state.form.feedbackMessage = 'feedbackPositive';
      } else {
        state.form.feedbackMessage = 'feedbackAlreadyExists';
      }
      posts.forEach((post) => {
        if (!state.posts.find((oldPost) => oldPost.postLink === post.postLink)) {
          const {
            // eslint-disable-next-line no-shadow
            feedId, postId, title, description, postLink,
          } = post;
          state.posts.push({
            feedId, postId, title, description, postLink,
          });
        }
      });
    } catch (error) {
      state.form.feedbackMessage = 'feedbackNoValidRSS';
      state.form.isValid = false;
    }
  });

const startRegularUpdate = (state) => {
  const checkFeeds = () => {
    console.log('Testing checkFeeds');
    if (state.feeds.length < 1) {
      return null;
    }
    const resultFeeds = state.feeds.map((feed) => loadFeed(feed, state));
    return Promise.allSettled(resultFeeds)
      .then(() => {
        setTimeout(checkFeeds, 5000);
      })
      .catch((e) => console.log('Error while checking feeds: ', e));
    // promise.all/ finally
  };
  return checkFeeds();
};
// определять выбранный фид по id
const main = async () => {
  const i18Inst = i18n.createInstance();
  await i18Inst.init({ resources });
  await i18Inst.changeLanguage('ru');
  const state = {
    language: 'en',
    form: {
      data: '',
      feedbackMessage: null,
      isValid: false,
    },
    currentFeedTitle: '',
    currentFeedDesc: '',
    currentFeedId: null,
    modal: {
      activePostId: null,
    },
    feeds: [],
    posts: [],
    uiState: {
      posts: [],
    },
  };
  const watchedState = onChange(state, view(state, i18Inst, elements));
  elements.formInput.addEventListener('input', (e) => {
    e.preventDefault();
    watchedState.form.data = e.target.value;
    console.log('Updated: ', watchedState.form.data);
  });
  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('Validating : ', watchedState.form.data);
    validate(watchedState.form.data)
      .then(() => {
        console.log('LOADING : ', watchedState.form.data);
        loadFeed(watchedState.form.data, watchedState);
        watchedState.form = { data: '', feedbackMessage: null, isValid: true };
        elements.formInput.value = '';
        // elements.formInput.value = '';
        view(state, i18Inst, elements);
      })
      .catch((error) => {
        watchedState.form = { data: '', feedbackMessage: error, isValid: false };
        // elements.formInput.value = '';
        watchedState.feeds = [];
        watchedState.posts = [];
        view(state, i18Inst, elements);
      });
  });
  startRegularUpdate(state);
};

main();
