const changeActivePost = (state, postId) => {
  state.modal.activePostId = postId;
};

const setPostAsViewed = (state, id) => {
  state.uiState.posts[id] = 'viewed';
};

const renderPosts = (state, i18Inst) => {
  if (state.posts.length <= 0) {
    return null;
  }
  return (`
    <div class="card border-0">
    <div class="card-body"><h2 class="card-title h4">${i18Inst.t('posts')}</h2></div>
    <ul class="list-group border-0 rounded-0">
    ${state.posts.map(({ title, postId, postLink }) => `<li id="${postId}" class="list-group-item post-item d-flex justify-content-between align-items-start border-0 border-end-0"><a
        href=${postLink}
        class=${state.uiState.posts[postId] === 'viewed' ? 'fw-normal' : 'fw-bold'} data-id="2" target="_blank" rel="noopener noreferrer">${title}</a>
        <button type="button" class="btn btn-outline-primary btn-sm" data-id="2" data-bs-toggle="modal"
                data-bs-target="#modal">${i18Inst.t('view')}
        </button>
    </li>`).join('')}
    </ul>
    </div>`);
};

const renderFeeds = (state, i18Inst) => {
  if (!state.currentFeedTitle || !state.currentFeedDesc) {
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

const render = (state, i18Inst, elements, path = '') => {
  if (path.startsWith('form')) {
    if (state.form.feedbackMessage) {
      elements.feedbackMessage.textContent = i18Inst.t(state.form.feedbackMessage);
      if (!state.form.isValid
          || state.form.feedbackMessage === 'feedbackAlreadyExists'
          || state.form.feedbackMessage === 'feedbackNetworkError') {
        elements.formInput.classList.add('is-invalid');
        elements.feedbackMessage.classList.remove('text-success');
        elements.feedbackMessage.classList.add('text-danger');
      } else if (state.form.feedbackMessage === 'feedbackPositive') {
        elements.formInput.classList.remove('is-invalid');
        elements.feedbackMessage.classList.remove('text-danger');
        elements.feedbackMessage.classList.add('text-success');
      }
      elements.feedbackMessage.textContent = i18Inst.t(state.form.feedbackMessage);
    } else {
      elements.feedbackMessage.textContent = '';
    }
  }
  if (path.startsWith('feeds')) {
    elements.feeds.innerHTML = '';
    elements.feeds.innerHTML = renderFeeds(state, i18Inst);
  }
  if (path.startsWith('posts')) {
    elements.posts.innerHTML = '';
    elements.posts.innerHTML = renderPosts(state, i18Inst);
    elements.fullArticle.innerHTML = i18Inst.t('fullArticle');
    const renderedPosts = document.querySelectorAll('.post-item');
    if (renderedPosts.length > 0) {
      renderedPosts.forEach((renderedPost) => {
        renderedPost.querySelector('button').addEventListener('click', () => {
          changeActivePost(state, renderedPost.getAttribute('id'));
          setPostAsViewed(state, renderedPost.getAttribute('id'));
          render(state, i18Inst, elements, path);
        });
      });
    }
    const activePost = state.posts.find((post) => post.postId === state.modal.activePostId);
    if (activePost) {
      const { title, description, postLink } = activePost;
      elements.modalHeader.innerHTML = title;
      elements.modalBody.innerHTML = description;
      elements.fullArticle.setAttribute('href', postLink);
    }
  }
};

export default (state, i18Inst, elements) => ((path) => {
  render(state, i18Inst, elements, path);
});
