import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as yup from 'yup';
import onChange from 'on-change';
import i18n from 'i18next';
import resources from './locales/locale.js';
import view from './view.js'
import _ from 'lodash'

const schema = yup.string().trim().required();

const validate = (url) => {
    return schema.validate(url, {abortEarly: false});
};

const elements = {
    innerHeader: document.querySelector("h1"),
    announcementP: document.querySelector(".lead"),
    form: document.querySelector("form"),
    formInput: document.getElementById('url-input'),
    formSubmit: document.querySelector('button[type="submit"]'),
    feedbackMessage: document.querySelector(".feedback"),
    feeds: document.querySelector(".feeds"),
    feedsHeader: document.querySelector(".feeds").querySelector('.h4'),
    feedsTitle: document.querySelector(".feeds").querySelector('.h6'),
    feedsDescription: document.querySelector(".feeds").querySelector('.text-black-50'),
    posts: document.querySelector(".posts"),
}

//локальный прокси-сервер all origins
const parseRss = (data, state) => {
    const parser = new DOMParser();
    const rssDOM = parser.parseFromString(data.contents, "text/html");
    const channel = rssDOM.querySelector('channel');
    const title = rssDOM.querySelector('title');
    const desc = rssDOM.querySelector('description');
    state.currentFeedTitle = title.textContent;
    state.currentFeedDesc = desc.textContent;
    const id = _.uniqueId();
    console.log('DOM: ', rssDOM);
    const items = channel.querySelectorAll('item');
    const posts = [...items].map((item) => {
        return { id, title: item.querySelector('title').textContent, description: item.querySelector('description').textContent}
    })
    //console.log('POSTS FROM PARSE: ', posts)
    return { title, id, desc, channel, posts };
}

const loadFeed = (link, state) => {
    fetch(`https://allorigins.hexlet.app/get?url=${encodeURIComponent(link)}`)
        .then(response => {
            console.log('response: ', response);
            if (response.ok) return response.json()
            state.form.feedbackMessage = new Error('Link not valid!')
            throw new Error('Link not valid!');
        })
        .then (data => {
            //Обработка ошибок DOM Parser
            const { title, id, desc, channel, posts }= parseRss(data, state);
            state.feeds.push([title.textContent, desc.textContent, link]);
            //посты - js объекты
            posts.forEach((post) => {
                const { id, title, description } = post;
                //console.log('POST: ', post);
                state.posts.push({ id, title, description });
            })
        })
        .then( () => {
            console.log('New state: ', state);
        })
};

//определять выбранный фид по id
const main = async () => {
    const i18Inst = i18n.createInstance();
    await i18Inst.init({resources});
    await i18Inst.changeLanguage('ru');
    console.log('Test i18: ', i18Inst.t('rssAggregator'));
    const state = {
        language: 'en',
        form: {
            data: '',
            feedbackMessage: null,
            isValid: false,
        },
        currentFeedTitle: '',
        currentFeedDesc: '',

        feeds: [],
        posts: [],
    }
    const watchedState = onChange(state, view(state, i18Inst, elements));
    const form = document.querySelector('form');
    const input = document.getElementById('url-input');
    console.log('field: ', input);
    input.addEventListener('input', (e) => {
        e.preventDefault();
        watchedState.form.data = e.target.value;
        console.log('Updated: ', watchedState.form.data);
    });
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Validating : ', watchedState.form.data);
        validate(watchedState.form.data)
            .then(() => {
                console.log('LOADING : ', watchedState.form.data);
                loadFeed( watchedState.form.data, state);
                watchedState.form = { data: '', feedbackMessage: null, isValid: true };
            })
            .catch((error) => {
                watchedState.form = { data: '', feedbackMessage: error, isValid: false };
                console.log('error: ', error);
            });

    })
    //render(state, i18Inst, elements);
}

main();