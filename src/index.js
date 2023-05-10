import 'bootstrap';
import * as yup from 'yup';
import i18n from 'i18next';
import axios from 'axios';
import _ from 'lodash';
import resources from './locales/locale.js';
import watch from './view.js';
import './index.scss';

let schema = yup.string().trim().required().url();

const errCodes = ['ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN', 'ERR_NETWORK'];

const validate = (url) => schema.validate(url, { abortEarly: false });

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

const handleActivePost = (state) => {
  const renderedPosts = document.querySelectorAll('.post-item');
  renderedPosts.forEach((renderedPost) => {
    renderedPost.querySelector('button').addEventListener('click', () => {
      handlePostClick(state, renderedPost);
    });
    renderedPost.querySelector('a').addEventListener('click', () => {
      handlePostClick(state, renderedPost);
    });
  });
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
      schema = yup.string().trim().required().url()
        .notOneOf(state.feeds.map((f) => f.link));
      state.posts.push(...posts);
      handleActivePost(state);
      state.form.isValid = true;
      state.form.feedbackMessage = 'feedbackPositive';
      state.loadingProcess.status = 'success';
    })
    .catch((error) => {
      state.form.isValid = false;
      state.form.feedbackMessage = errCodes.includes(error.code) ? 'errorNetwork' : 'errorNoValidRss';
      state.loadingProcess.status = 'fail';
      throw new Error(error);
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
    handleActivePost(state);
  })
  .catch((error) => {
    throw (error);
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

const validateFormData = (watchedState) => validate(watchedState.form.data)
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
      watchedState.loadingProcess.status = 'idle';
      formInput.autofocus = true;
      watchedState.form.data = '';
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
      posts: [],
    },
  };
  const i18Inst = i18n.createInstance();
  i18Inst.init({ resources, lng: 'ru' })
    .then(() => {
      const watchedState = watch(state, i18Inst, elements);
      const { formInput, form } = elements;
      formInput.addEventListener('input', (e) => {
        e.preventDefault();
        watchedState.form.data = e.target.value;
      });
      form.addEventListener('submit', (e) => submitForm(e, watchedState, formInput));
      startRegularUpdate(watchedState);
    })
    .catch((error) => console.error(error));
};

main();
