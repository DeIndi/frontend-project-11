import onChange from 'on-change';

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
        <li id="${postId}" class="list-group-item post-item d-flex justify-content-between align-items-start border-0 border-end-0">
          <a href="${postLink}" class="${state.uiState.posts[postId] === 'viewed' ? 'fw-normal' : 'fw-bold'}" data-id="2" target="_blank" rel="noopener noreferrer">
            ${title}
          </a>
          <button type="button" class="btn btn-outline-primary btn-sm" data-id="2" data-bs-toggle="modal" data-bs-target="#modal">
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
  return (`<div class="card border-0">
            <div class="card-body"><h2 class="card-title h4">${i18Inst.t('feeds')}</h2></div>
            <ul class="list-group border-0 rounded-0">
            ${state.feeds.map(({ title, desc }) => `<li class="list-group-item border-0 border-end-0"><h3 class="h6 m-0">${title}</h3>
                <p class="m-0 small text-black-50">${desc}</p></li>`).join('')}
            </ul>
        </div>`);
};

const renderForm = (state, i18Inst, elements) => {
  const { feedbackMessage, isValid } = state.form;
  const localizedMessage = isValid ? i18Inst.t(feedbackMessage) : i18Inst.t(`errors.${feedbackMessage}`);
  if (feedbackMessage) {
    elements.feedbackMessage.textContent = localizedMessage;
    elements.formInput.classList.toggle('is-invalid', !isValid);
    elements.feedbackMessage.classList.toggle('text-success', isValid);
    elements.feedbackMessage.classList.toggle('text-danger', !isValid);
  } else {
    elements.feedbackMessage.textContent = '';
  }
};

const render = (state, i18Inst, elements, path = '') => {
  if (path.startsWith('form')) {
    renderForm(state, i18Inst, elements);
  }
  if (path.startsWith('feeds')) {
    elements.feeds.innerHTML = renderFeeds(state, i18Inst);
  }
  if (path.startsWith('posts')) {
    console.log('path: ', path);
    elements.posts.innerHTML = renderPosts(state, i18Inst);
    elements.fullArticle.innerHTML = i18Inst.t('fullArticle');

    const activePost = state.posts.find((post) => post.postId === state.modal.activePostId);
    if (activePost) {
      const { title, description, postLink } = activePost;
      elements.modalHeader.innerHTML = title;
      elements.modalBody.innerHTML = description;
      elements.fullArticle.href = postLink;
    }
  }

  const isFormLoading = state.loadingProcess.status === 'loading';
  elements.formSubmit.disabled = isFormLoading;
};

const wrapRender = (state, i18Inst, elements) => ((path) => {
  render(state, i18Inst, elements, path);
});

export default (state, i18Inst, elements) => onChange(state, wrapRender(state, i18Inst, elements));
