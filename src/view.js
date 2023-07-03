import onChange from 'on-change';
import DOMPurify from 'dompurify';

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

const renderPost = (state, i18Instance, { sanitizedTitle, sanitizedPostId, sanitizedPostLink }) => `
  <li class="list-group-item post-item d-flex justify-content-between align-items-start border-0 border-end-0">
    <a
      href="${sanitizedPostLink}"
      class="${state.uiState.viewedPosts.has(sanitizedPostId) ? 'fw-normal' : 'fw-bold'}"
      data-id="${sanitizedPostId}"
      target="_blank"
      rel="noopener noreferrer"
    >
    ${sanitizedTitle}
    </a>
    <button
      type="button"
      class="btn btn-outline-primary btn-sm"
      data-id="${sanitizedPostId}"
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
  const sanitizedPosts = state.posts.map(({ title, postId, postLink }) => {
    const sanitizedTitle = DOMPurify.sanitize(title);
    const sanitizedPostId = DOMPurify.sanitize(postId);
    const sanitizedPostLink = DOMPurify.sanitize(postLink);
    return { sanitizedTitle, sanitizedPostId, sanitizedPostLink };
  });
  return (`
    <div class="card border-0">
      <div class="card-body">
        <h2 class="card-title h4">
          ${i18Instance.t('posts')}
        </h2>
      </div>
      <ul class="list-group border-0 rounded-0">
        ${sanitizedPosts.map((sanitizedPost) => renderPost(state, i18Instance, sanitizedPost)).join('')}
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
          ${DOMPurify.sanitize(i18Instance.t('feeds'))}
        </h2>
      </div>
      <ul class="list-group border-0 rounded-0">
        ${state.feeds.map(({ title, desc }) => `
          <li class="list-group-item border-0 border-end-0">
            <h3 class="h6 m-0">
              ${DOMPurify.sanitize(title)}
            </h3>
            <p class="m-0 small text-black-50">
              ${DOMPurify.sanitize(desc)}
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
  elements.modalHeader.innerHTML = DOMPurify.sanitize(title);
  elements.modalBody.innerHTML = DOMPurify.sanitize(description);
  elements.fullArticle.href = DOMPurify.sanitize(postLink);
  elements.fullArticle.innerHTML = DOMPurify.sanitize(i18Instance.t('fullArticle'));
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
