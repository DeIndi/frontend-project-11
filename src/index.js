import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as yup from 'yup';
import onChange from 'on-change';
import axios from 'axios';
import i18n from 'i18next';

/*const routes = {
   usersPath: () => '/users',
};*/

const schema = yup.object().shape({
   url: yup.string().trim().required(),
});

const validate =  (field) => {
      return schema.validate(field, { abortEarly: false });
};

const state = {
   form: {
      data: '',
      errors: {},
   },
   feeds: [],
}

/*catch (e) {
   return e.message;
}*/

const watchedState = onChange(state, (path, value) => {
   if (path.startsWith('form')) {
       render(state, 'valid'); // path, value определяют, что именно рендерить
   }
   else if (path.startsWith('errors')) {
       render(state, 'invalid');
   }
});

const loadFeed = (link, state) => {
    axios
        .get(link)
        .then( (response) => {
            state.feeds.push(response);
            console.log(response);
        }).catch((error) => {
            return error;
    })
};

const main = () => {
   console.log(watchedState);
   const form = document.querySelector('form');
   const field = document.querySelector('.form-control');
   field.addEventListener('input', (e) => {
      e.preventDefault();
      watchedState.form.data = e.target.value;
      //watchedState.rssForm.errors = validate(watchedState.rssForm.data);
   });
   form.addEventListener('submit', (e) => {
      e.preventDefault();
      validate(field.textContent)
          .then((value) => {
             watchedState.form = {};
             console.log('value: ', value);
             loadFeed(field.textContent);
         })
          .catch((error) => {
             watchedState.form = { errors:{error}};
             console.log('error: ', error);
          });

   })
}

   const render = (state) => {

   }

main();