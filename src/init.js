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
    .notOneOf((feeds ?? []).map((f) => f.link), 'exists');
  return schema
    .validate(url, { abortEarly: false });
};

const proxifyLink = (link) => new URL(`${proxyServer}get?url=${encodeURIComponent(link)}&disableCache=true`);

const parseRss = (data) => {
  const parser = new DOMParser();
  const rssDOM = parser.parseFromString(data.contents, 'text/xml');
  const errorNode = rssDOM.querySelector('parsererror');
  if (errorNode) {
    const error = new Error(errorNode.textContent);
    error.code = 'errorNoValidRss';
    throw error;
  }
  const channel = rssDOM.querySelector('channel');
  const title = rssDOM.querySelector('title');
  const desc = rssDOM.querySelector('description');
  const items = channel.querySelectorAll('item');
  const posts = [...items].map((item) => ({
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
      const { title, desc, posts } = parseRss(response.data, state);
      const feedId = _.uniqueId();
      state.feeds.push({
        feedId, title: title.textContent, desc: desc.textContent, link,
      });
      state.posts.push(...posts.map((post) => ({ ...post, postId: _.uniqueId() })));
      state.loadingProcess = { status: 'success' };
    })
    .catch((error) => {
      if (networkErrorCodes.includes(error.code)) {
        error.code = 'errorNetwork';
      }
      state.loadingProcess = { status: 'fail', error: error.code };
    });
};

const updateFeed = (link, state) => axios.get(proxifyLink(link))
  .then((response) => {
    if (!response.data?.contents) {
      return;
    }
    const { posts } = parseRss(response.data);
    state.posts = [...state.posts, ...posts.filter(
      (post) => !state.posts.find((oldPost) => oldPost.postLink === post.postLink),
    )];
  })
  .catch(console.error);

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
    return error;
  });

const handleSubmitForm = (watchedState, event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const input = formData.get('url');
  validateFeedUrl(input, watchedState.feeds)
    .then((validationError) => {
      if (validationError) {
        const errorMessage = validationError.code ? `validationError_${validationError.code}` : 'errorDefault';
        watchedState.form = { ...watchedState.form, isValid: false, error: errorMessage };
      } else {
        watchedState.form = { ...watchedState.form, isValid: true, error: null };
        loadFeed(input, watchedState);
      }
    })
    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      watchedState.loadingProcess = { status: 'idle' };
      watchedState.form = { ...watchedState.form };
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
    language: 'ru',
    loadingProcess: {
      error: null,
      status: 'idle',
    },
    form: {
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
  const i18Instance = i18n.createInstance();
  i18Instance.init({ resources, lng: 'ru' })
    .then(() => {
      const watchedState = watch(state, i18Instance, elements);
      elements.form.addEventListener('submit', (event) => handleSubmitForm(watchedState, event));
      elements.posts.addEventListener('click', (event) => handlePostClick(watchedState, event));
      startRegularUpdate(watchedState);
    })
    .catch((error) => console.error(error));
};

export default main;
