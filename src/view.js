import onChange from 'on-change';
import { sanitize } from 'dompurify';

const removeClassStartsWith = (node, classNamePrefix) => {
  [...node.classList].forEach((className) => {
    if (className.startsWith(classNamePrefix)) {
      node.classList.remove(className);
    }
  });
};

const renderFeedback = (elements, feedbackType, message) => {
  const { feedbackMessage } = elements;
  removeClassStartsWith(feedbackMessage, 'text-');
  feedbackMessage.textContent = message;
  feedbackMessage.classList.add(`text-${feedbackType}`);
};

const renderPost = (state, i18Instance, { title, postId, postLink }) => `
  <li class="list-group-item post-item d-flex justify-content-between align-items-start border-0 border-end-0">
    <a
      href="${sanitize(postLink)}"
      class="${state.uiState.viewedPosts.has(postId) ? 'fw-normal' : 'fw-bold'}"
      data-id="${postId}"
      target="_blank"
      rel="noopener noreferrer"
    >
    ${title}
    </a>
    <button
      type="button"
      class="btn btn-outline-primary btn-sm"
      data-id="${postId}"
      data-bs-toggle="modal"
      data-bs-target="#modal"
    >
      ${i18Instance.t('view')}
    </button>
  </li>
`;

const renderPosts = (state, i18Instance) => {
  if (state.posts.length <= 0) {
    return null;
  }
  return (`
    <div class="card border-0">
      <div class="card-body">
        <h2 class="card-title h4">
          ${i18Instance.t('posts')}
        </h2>
      </div>
      <ul class="list-group border-0 rounded-0">
        ${state.posts.map((post) => renderPost(state, i18Instance, post)).join('')}
      </ul>
    </div>
  `);
};

const renderFeeds = (state, i18Instance) => {
  if (state.feeds.length <= 0) {
    return null;
  }
  return (`
    <div class="card border-0">
      <div class="card-body">
        <h2 class="card-title h4">
          ${sanitize(i18Instance.t('feeds'))}
        </h2>
      </div>
      <ul class="list-group border-0 rounded-0">
        ${state.feeds.map(({ title, desc }) => `
          <li class="list-group-item border-0 border-end-0">
            <h3 class="h6 m-0">
              ${sanitize(title)}
            </h3>
            <p class="m-0 small text-black-50">
              ${sanitize(desc)}
            </p>
          </li>
        `).join('')}
      </ul>
    </div>
  `);
};

const handleForm = (state, elements, i18Instance) => {
  const { isValid } = state.form;
  if (isValid) {
    elements.formInput.classList.remove('is-invalid');
  } else {
    elements.formInput.classList.add('is-invalid');
    renderFeedback(elements, 'danger', i18Instance.t(`errors.${state.form.error}`));
  }
};

const handleLoadingProcess = (state, elements, i18Instance) => {
  switch (state.loadingProcess.status) {
    case 'idle':
      elements.formInput.value = '';
      elements.formSubmit.disabled = false;
      break;
    case 'success':
      renderFeedback(elements, 'success', i18Instance.t('rssLoadingSuccess'));
      elements.formInput.focus();
      elements.formSubmit.disabled = false;
      break;
    case 'fail':
      renderFeedback(elements, 'danger', i18Instance.t(`errors.${state.loadingProcess.error}`));
      elements.formSubmit.disabled = false;
      break;
    case 'loading':
      renderFeedback(elements, '', '');
      elements.formSubmit.disabled = true;
      break;
    default:
      break;
  }
};

const handleModal = (state, elements, i18Instance) => {
  const activePost = state.posts.find((post) => post.postId === state.modal.activePostId);
  if (!activePost) {
    return null;
  }
  const { title, description, postLink } = activePost;
  elements.modalHeader.innerText = sanitize(title);
  elements.modalBody.innerText = sanitize(description);
  elements.fullArticle.href = sanitize(postLink);
  elements.fullArticle.innerText = sanitize(i18Instance.t('fullArticle'));
  return null;
};

const handleFeedsSection = (state, elements, i18Instance) => {
  elements.feeds.innerHTML = renderFeeds(state, i18Instance);
};

const handlePostsSection = (state, elements, i18Instance) => {
  elements.posts.innerHTML = renderPosts(state, i18Instance);
};

const dispatch = (state, i18Instance, elements, path = '') => {
  if (path.startsWith('loadingProcess')) {
    handleLoadingProcess(state, elements, i18Instance);
  }
  if (path.startsWith('form')) {
    handleForm(state, elements, i18Instance);
  }
  if (path.startsWith('feeds')) {
    handleFeedsSection(state, elements, i18Instance);
  }
  if (path.startsWith('posts') || path.startsWith('uiState')) {
    handlePostsSection(state, elements, i18Instance);
  }
  if (path.startsWith('modal')) {
    handleModal(state, elements, i18Instance);
  }
};

export default (state, i18Instance, elements) => onChange(state, (path) => {
  dispatch(state, i18Instance, elements, path);
});
