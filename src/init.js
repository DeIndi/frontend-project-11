import 'bootstrap';
import * as yup from 'yup';
import i18n from 'i18next';
import axios from 'axios';
import _ from 'lodash';
import resources from './locales/locale.js';
import watch from './view.js';

const networkErrorCodes = ['ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN', 'ERR_NETWORK'];
const proxyServer = 'https://allorigins.hexlet.app/';
const updateTimeout = 5000;

const validate = (url, feeds) => {
  const schema = yup.string().trim().required('required').url('url')
    .notOneOf(feeds.map((f) => f.link), 'exists');
  return schema
    .validate(url, { abortEarly: false });
};

const proxifyLink = (link) => `${proxyServer}get?url=${encodeURIComponent(link)}&disableCache=true`;

const parseRss = (data) => {
  const parser = new DOMParser();
  const rssDOM = parser.parseFromString(data.contents, 'text/xml');
  const errorNode = rssDOM.querySelector('parsererror');
  if (errorNode) {
    const error = new Error('Incorrect document type');
    error.code = 'errorNoValidRss';
    throw error;
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

const markPostAsViewed = (state, id) => {
  state.uiState.viewedPosts.add(id);
};

const handlePostClick = (state, event) => {
  const postId = event.target.getAttribute('data-id');
  changeActivePost(state, postId);
  markPostAsViewed(state, postId);
};

const loadFeed = (link, state) => {
  state.loadingProcess.status = 'loading';
  return axios.get(proxifyLink(link))
    .then((response) => {
      if (!response.data) {
        throw new Error("Can't be loaded!");
      }
      const { title, desc, posts } = parseRss(response.data, state);
      const feedId = _.uniqueId();
      state.feeds.push({
        feedId, title: title.textContent, desc: desc.textContent, link,
      });
      state.posts.push(...posts);
      state.loadingProcess = { status: 'success' };
    })
    .catch((error) => {
      if (networkErrorCodes.includes(error.code)) {
        error.code = 'errorNetwork';
      }
      console.log('entering catch');
      state.loadingProcess = { status: 'fail', error: error.code };
      console.log('new state.loadingProcess: ', state.loadingProcess);
    });
};

const updateFeed = (link, state) => axios.get(proxifyLink(link))
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
        setTimeout(checkFeeds, updateTimeout);
      })
      .catch((error) => console.error(error));
  };
  return checkFeeds();
};

const validateFeedUrl = (feedUrl, watchedState) => validate(feedUrl, watchedState.feeds)
  .then(() => null)
  .catch((error) => {
    error.code = error.message;
    console.log('validation error: ', error);
    return error;
  });

const handleSubmitForm = (event, watchedState) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const input = formData.get('url');
  validateFeedUrl(input, watchedState)
    .then((validationError) => {
      if (validationError) {
        let errorMessage = 'errorNotValidUrl';
        if (validationError.code.startsWith('exists')) {
          errorMessage = 'errorAlreadyExists';
        }
        if (validationError.code.startsWith('required')) {
          errorMessage = 'errorEmptyInput';
        }
        watchedState.form = { ...watchedState.form, isValid: false, error: errorMessage };
      } else {
        watchedState.form = { ...watchedState.form, isValid: true, error: null };
        loadFeed(watchedState.form.data, watchedState);
      }
    })
    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      watchedState.loadingProcess = { status: 'idle' };
      watchedState.form = { ...watchedState.form, data: '' };
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
      error: null,
      status: 'idle',
    },
    form: {
      data: '',
      isValid: true,
      error: null,
    },
    modal: {
      activePostId: null,
    },
    feeds: [],
    posts: [],
    uiState: {
      viewedPosts: new Set(),
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
      elements.form.addEventListener('submit', (event) => handleSubmitForm(event, watchedState));
      elements.posts.addEventListener('click', (event) => handlePostClick(watchedState, event));
      startRegularUpdate(watchedState);
    })
    .catch((error) => console.error(error));
};

export default main;
