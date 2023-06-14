import onChange from 'on-change';

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

const renderPosts = (state, i18Inst) => {
  if (state.posts.length <= 0) {
    return null;
  }
  return (`
  <div class="card border-0">
    <div class="card-body">
      <h2 class="card-title h4">${i18Inst.t('posts')}</h2>
    </div>
    <ul class="list-group border-0 rounded-0">
      ${state.posts.map(({ title, postId, postLink }) => `
        <li class="list-group-item post-item d-flex justify-content-between align-items-start border-0 border-end-0">
          <a
            href="${postLink}"
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
            ${i18Inst.t('view')}
          </button>
        </li>
      `).join('')}
    </ul>
  </div>
`);
};

const renderFeeds = (state, i18Inst) => {
  if (state.feeds.length <= 0) {
    return null;
  }
  return (`
    <div class="card border-0">
      <div class="card-body">
        <h2 class="card-title h4">
          ${i18Inst.t('feeds')}
        </h2>
      </div>
      <ul class="list-group border-0 rounded-0">
        ${state.feeds.map(({ title, desc }) => `
          <li class="list-group-item border-0 border-end-0">
            <h3 class="h6 m-0">
              ${title}
            </h3>
            <p class="m-0 small text-black-50">
              ${desc}
            </p>
          </li>
        `).join('')}
      </ul>
    </div>`);
};

const handleForm = (state, elements, i18Inst) => {
  const { isValid } = state.form;
  console.log('state.form', state.form);
  if (isValid) {
    elements.formInput.classList.remove('is-invalid');
  } else {
    elements.formInput.classList.add('is-invalid');
    renderFeedback(elements, 'danger', i18Inst.t(`errors.${state.form.error}`));
  }
};

const handleLoadingProcess = (state, elements, i18Inst) => {
  switch (state.loadingProcess.status) {
    case 'idle':
      elements.formInput.value = '';
      elements.formSubmit.disabled = false;
      break;
    case 'success':
      renderFeedback(elements, 'success', i18Inst.t('rssLoadingSuccess'));
      elements.formInput.focus();
      elements.formSubmit.disabled = false;
      break;
    case 'fail':
      console.log('state.form.error: ', state.loadingProcess);
      renderFeedback(elements, 'danger', i18Inst.t(`errors.${state.loadingProcess.error}`));
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

const handleModal = (state, elements, i18Inst) => {
  const activePost = state.posts.find((post) => post.postId === state.modal.activePostId);
  if (!activePost) {
    return null;
  }
  const { title, description, postLink } = activePost;
  elements.modalHeader.innerHTML = title;
  elements.modalBody.innerHTML = description;
  elements.fullArticle.href = postLink;
  elements.fullArticle.innerHTML = i18Inst.t('fullArticle');
  return null;
};

const handleFeedsSection = (state, elements, i18Inst) => {
  elements.feeds.innerHTML = renderFeeds(state, i18Inst);
};

const handlePostsSection = (state, elements, i18Inst) => {
  elements.posts.innerHTML = renderPosts(state, i18Inst);
};

const dispatch = (state, i18Inst, elements, path = '') => {
  if (path.startsWith('loadingProcess')) {
    handleLoadingProcess(state, elements, i18Inst);
  }
  if (path.startsWith('form')) {
    handleForm(state, elements, i18Inst);
  }
  if (path.startsWith('feeds')) {
    handleFeedsSection(state, elements, i18Inst);
  }
  if (path.startsWith('posts') || path.startsWith('uiState')) {
    handlePostsSection(state, elements, i18Inst);
  }
  if (path.startsWith('modal')) {
    handleModal(state, elements, i18Inst);
  }
};

const wrapRender = (state, elements, i18Inst) => ((path) => {
  dispatch(state, i18Inst, elements, path);
});

export default (state, i18Inst, elements) => onChange(state, wrapRender(state, elements, i18Inst));
