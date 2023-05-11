import 'bootstrap';
import * as yup from 'yup';
import i18n from 'i18next';
import axios from 'axios';
import _ from 'lodash';
import resources from './locales/locale.js';
import watch from './view.js';
import './index.scss';

const baseSchema = yup.string().trim().required().url();
let schema = baseSchema;

const errorCodes = ['ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN', 'ERR_NETWORK'];

const validateLink = (url) => schema.validate(url, { abortEarly: false });

const proxyLink = (link) => `https://allorigins.hexlet.app/get?url=${encodeURIComponent(link)}&disableCache=true`;

const parseRss = (data) => {
  const parser = new DOMParser();
  const rssDOM = parser.parseFromString(data.contents, 'text/xml');
  const errorNode = rssDOM.querySelector('parsererror');
  if (errorNode) {
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

const changeActivePost = (state, id) => {
  state.modal.activePostId = id;
};

const setPostAsViewed = (state, id) => {
  state.uiState.viewedPosts[id] = true;
};

const handlePostClick = (state, event) => {
  const postId = event.target.getAttribute('data-id');
  changeActivePost(state, postId);
  setPostAsViewed(state, postId);
};

const loadFeed = (link, state) => {
  state.loadingProcess.status = 'loading';
  return axios.get(proxyLink(link))
    .then((response) => {
      if (!response.data) {
        throw new Error("Can't be loaded!");
      }
      const { title, desc, posts } = parseRss(response.data, state);
      const feedId = _.uniqueId();
      state.feeds.push({
        feedId, title: title.textContent, desc: desc.textContent, link,
      });
      schema = baseSchema.notOneOf(state.feeds.map((f) => f.link));
      state.posts.push(...posts);
      state.loadingProcess = { status: 'success' };
      state.form = { ...state.form, isValid: true, feedbackMessage: 'feedbackPositive' };
    })
    .catch((error) => {
      state.form.isValid = false;
      state.form.feedbackMessage = errorCodes.includes(error.code) ? 'errorNetwork' : 'errorNoValidRss';
      state.loadingProcess.status = 'fail';
      throw error;
    });
};

const updateFeed = (link, state) => axios.get(proxyLink(link))
  .then((response) => {
    if (response.data) return response.data;
    throw new Error("Can't be loaded!");
  })
  .then((data) => {
    if (!data.contents) {
      return;
    }
    const { posts } = parseRss(data);
    state.posts = [...state.posts, ...posts.filter(
      (post) => !state.posts.find((oldPost) => oldPost.postLink === post.postLink),
    )];
  })
  .catch((error) => {
    throw error;
  });

const startRegularUpdate = (state) => {
  const checkFeeds = () => {
    const resultFeeds = state.feeds.map((feed) => updateFeed(feed.link, state));
    return Promise.allSettled(resultFeeds)
      .then(() => {
        setTimeout(checkFeeds, 5000);
      })
      .catch((error) => console.error(error));
  };
  return checkFeeds();
};

const validateFormData = (watchedState) => validateLink(watchedState.form.data)
  .catch((error) => {
    watchedState.form.feedbackMessage = 'errorNotValidUrl';
    if (error.message.startsWith('this must not be one of')) {
      watchedState.form.feedbackMessage = 'errorAlreadyExists';
    }
    if (!watchedState.form.data) {
      watchedState.form.feedbackMessage = 'errorEmptyInput';
    }
    watchedState.form.isValid = false;
    watchedState.loadingProcess.status = 'fail';
    throw error;
  });

const submitForm = (event, watchedState, formInput) => {
  event.preventDefault();
  validateFormData(watchedState)
    .then(() => loadFeed(watchedState.form.data, watchedState))
    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      watchedState.loadingProcess = { status: 'idle' };
      watchedState.form = { ...watchedState.form, data: '' };
      formInput.value = '';
    });
};

const main = () => {
  const elements = {
    form: document.querySelector('form'),
    formInput: document.getElementById('url-input'),
    formSubmit: document.querySelector('button[type="submit"]'),
    feedbackMessage: document.querySelector('.feedback'),
    feeds: document.querySelector('.feeds'),
    feedsHeader: document.querySelector('.feeds').querySelector('.h4'),
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
      feedbackMessage: null,
      isValid: false,
    },
    modal: {
      activePostId: null,
    },
    feeds: [],
    posts: [],
    uiState: {
      viewedPosts: {},
    },
  };
  const i18Inst = i18n.createInstance();
  i18Inst.init({ resources, lng: 'ru' })
    .then(() => {
      const watchedState = watch(state, i18Inst, elements);
      elements.formInput.addEventListener('input', (e) => {
        e.preventDefault();
        watchedState.form.data = e.target.value;
      });
      elements.form.addEventListener('submit', (e) => submitForm(e, watchedState, elements.formInput));
      elements.posts.addEventListener('click', (event) => {
        handlePostClick(watchedState, event);
      });
      startRegularUpdate(watchedState);
    })
    .catch((error) => console.error(error));
};

main();
