const changeActivePost = (postId, state) => {
    state.modal.activePostId = postId;
}

const setPostAsViewed = (state, postId) => {
    state.uiState.posts[postId] = 'viewed';
    console.log('UI STATE: ',state.uiState);
}

const renderPosts = (state, i18Inst) => {
    if (state.posts.length <= 0) {
        return null;
    }
    return (`
    <div class="card border-0">
    <div class="card-body"><h2 class="card-title h4">${i18Inst.t('posts')}</h2></div>
    <ul class="list-group border-0 rounded-0">
    ${state.posts.map(({title, postId, postLink}) => `<li id="${postId}" class="list-group-item post-item d-flex justify-content-between align-items-start border-0 border-end-0"><a
        href=${postLink}
        class=${state.uiState.posts[postId]==='viewed'?"fw-normal":"fw-bold"} data-id="2" target="_blank" rel="noopener noreferrer">${title}</a>
        <button type="button" class="btn btn-outline-primary btn-sm" data-id="2" data-bs-toggle="modal"
                data-bs-target="#modal">${i18Inst.t('view')}
        </button>
    </li>`).join('')}
    </ul>
    </div>`)
    //делегирование одиин обработчик
}

const renderFeeds = (state, i18Inst) => {
    if (!state.currentFeedTitle || !state.currentFeedDesc) {
        return null;
    }
    return (`<div className="card border-0">
            <div className="card-body"><h2 className="card-title h4">${i18Inst.t('feeds')}</h2></div>
            <ul className="list-group border-0 rounded-0">
            ${state.feeds.map(({title, desc}) => `<li className="list-group-item border-0 border-end-0"><h3 className="h6 m-0">${title}</h3>
                <p className="m-0 small text-black-50">${desc}</p></li>`
    ).join('')}
            </ul>
        </div>`);
}

const render = (state, i18Inst, elements, path = '') => {
    console.log('PATH (from render): ', path);
    //выделить в отдельную функцию
    //первый уровень - диспетчеризация
    //второй уровень - рендер части
    if (path.startsWith('form')) {
        if (state.form.error) {
            elements.feedbackMessage.style.color = '#0xFF0000';
            elements.feedbackMessage.textContent = i18Inst.t('feedbackNegative');
        } else {
            // elements.feedbackMessage.style.color = '#0x00FF00';
            // elements.feedbackMessage.textContent = i18Inst.t('feedbackPositive');
        }
        if (state.form.feedbackMessage) {
            elements.feedbackMessage.textContent = i18Inst.t(state.form.feedbackMessage);
            //корректная строка
        } else {
            elements.feedbackMessage.textContent = '';
        }
    }
    //  elements.feedbackMessage.textContent = i18Inst.t('');
    //если path начинается со слова form, то независимо от того, что изменилось, обрабатывается и то, и другое
    // if (path.startsWith('feeds')) {
    elements.feeds.innerHTML = '';
    elements.feeds.innerHTML = renderFeeds(state, i18Inst);
    // }
    // if (path.startsWith('feeds')) {
    elements.posts.innerHTML = '';
    elements.posts.innerHTML = renderPosts(state, i18Inst);
    elements.fullArticle.innerHTML = i18Inst.t('fullArticle');
    console.log('state.posts: ', state.posts);
    const renderedPosts = document.querySelectorAll('.post-item');
    if (renderedPosts.length > 0) {
        renderedPosts.forEach((renderedPost) => {
            renderedPost.querySelector('button').addEventListener('click', () => {
                changeActivePost(renderedPost.getAttribute("id"), state);
                render(state, i18Inst, elements, path);
            });
        })
    }
    const activePost = state.posts.find((post) => post.postId === state.modal.activePostId);
    console.log('state.modal.activePostId: ', state.modal.activePostId);
    console.log('post: ', activePost);
    console.log('posts (for comparison): ', state.posts);
    if (activePost) {
        console.log('FOUND active post in posts array!');
        const {title, description, postLink} = activePost;
        elements.modalHeader.innerHTML = title;
        elements.modalBody.innerHTML = description;
        elements.fullArticle.setAttribute('href', postLink);
    }
}

export default (state, i18Inst, elements) => {
    return ((path) => {
        render(state, i18Inst, elements, path);
    })
};
//render (и onChange) в этом же файле