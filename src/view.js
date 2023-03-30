import {stat} from "@babel/core/lib/gensync-utils/fs.js";

const render = (state, i18Inst, elements, path = '') => {
    console.log('PATH (from render): ', path);
    //выделить в отдельную функцию
    //первый уровень - диспетчеризация
    //второй уровень - рендер части
    if (path.startsWith('form')) {
        if (state.form.error || !state.form.isValid) {
            elements.feedbackMessage.style.color = '#0xFF0000';
            elements.feedbackMessage.textContent = i18Inst.t('feedbackNegative');
        }
        else {
           // elements.feedbackMessage.style.color = '#0x00FF00';
           // elements.feedbackMessage.textContent = i18Inst.t('feedbackPositive');
        }
        if ( state.form.feedbackMessage ) {
            elements.feedbackMessage.textContent = i18Inst.t(state.form.feedbackMessage);
            //корректная строка
        } else {
            elements.feedbackMessage.textContent = '';
        }
    }
    //  elements.feedbackMessage.textContent = i18Inst.t('');
    //если path начинается со слова form, то независимо от того, что изменилось, обрабатывается и то, и другое
    elements.feeds.innerHTML = '';
    elements.innerHeader.textContent = i18Inst.t('rssAggregator');
    elements.announcementP.textContent = i18Inst.t('announcement');
    elements.formSubmit.textContent = i18Inst.t('add');
    //заменить на текст html с подставлением с innerHTML
    const divFeedsCard = document.createElement('div');
    divFeedsCard.classList.add('card', 'border-0');
    const divFeedsCardBody = document.createElement('div');
    divFeedsCardBody.classList.add('card-body');
    const header = document.createElement('h2');
    header.classList.add('card-title', 'h4');
    header.textContent =  i18Inst.t('feeds');
    divFeedsCardBody.appendChild(header);
    divFeedsCard.appendChild(divFeedsCardBody);
    const ulFeeds = document.createElement('ul');
    ulFeeds.classList.add("list-group", "border-0" ,"rounded-0");
    const liFeeds = document.createElement('li');
    liFeeds.classList.add("list-group-item", "border-0", "border-end-0");
    const liFeedsHeader = document.createElement('h3');
    liFeedsHeader.classList.add("h6", "m-0");
    liFeedsHeader.textContent = state.currentFeedTitle;
    const liFeedsDesc = document.createElement('p');
    liFeedsDesc.classList.add("m-0", "small", "text-black-50");
    liFeedsDesc.textContent = state.currentFeedDesc;
    liFeeds.appendChild(liFeedsHeader);
    liFeeds.appendChild(liFeedsDesc);
    ulFeeds.appendChild(liFeeds);
    divFeedsCard.appendChild(ulFeeds);
    elements.feeds.appendChild(divFeedsCard);
    const postsHtml = ` 
         <div className="card border-0">
            <div className="card-body"><h2 className="card-title h4">${i18Inst.t('posts')}</h2></div>
            <ul className="list-group border-0 rounded-0">
                <li className="list-group-item d-flex justify-content-between align-items-start border-0 border-end-0"><a
                    href="https://ru.hexlet.io/courses/python-functions/lessons/pure-functions/theory_unit"
                    className="fw-bold" data-id="2" target="_blank" rel="noopener noreferrer">postTitle</a>
                    <button type="button" className="btn btn-outline-primary btn-sm" data-id="2" data-bs-toggle="modal"
                            data-bs-target="#modal">Просмотр
                    </button>
                </li>
            </ul>
        </div>`;
}

export default (state, i18Inst, elements) => {
    return ((path)=> {
        render (state, i18Inst, elements, path);
    })
};
//render (и onChange) в этом же файле