document.addEventListener('DOMContentLoaded', () => {
    // Конфигурация
    const API_BASE_URL = 'http://127.0.0.1:8000/api';
    const MEDIA_URL = 'http://127.0.0.1:8000/media';

    // Элементы DOM
    const elements = {
        newPostForm: document.getElementById('new-post-form'),
        newPostText: document.getElementById('new-post-text'),
        newPostImages: document.getElementById('new-post-images'),
        postsContainer: document.getElementById('posts'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        logoutBtn: document.getElementById('logout-btn'),
        userInfo: document.getElementById('user-info'),
        usernameDisplay: document.getElementById('username-display'),
        authForms: document.getElementById('auth-forms'),
        showLoginBtn: document.getElementById('show-login'),
        showRegisterBtn: document.getElementById('show-register'),
        authButtons: document.getElementById('auth-buttons')
    };

    // Проверка авторизации
    const checkAuth = async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/posts/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.ok;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    };

    // Обновление UI
    const updateUI = async () => {
        const isAuth = await checkAuth();
        elements.authForms.classList.toggle('hidden', isAuth);
        elements.newPostForm.classList.toggle('hidden', !isAuth);
        elements.userInfo.classList.toggle('hidden', !isAuth);
        
        if (isAuth) {
            const username = localStorage.getItem('username');
            if (username) elements.usernameDisplay.textContent = username;
        }
        await fetchPosts(); // Всегда загружаем посты, даже для неавторизованных
    };

    // Загрузка постов (работает для всех)
    const fetchPosts = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const headers = {};
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${API_BASE_URL}/posts/`, { headers });
            
            if (!response.ok) {
                // Не показываем ошибку 401 (Unauthorized) пользователю
                if (response.status !== 401) {
                    throw new Error('Ошибка загрузки постов');
                }
                return;
            }
            
            const data = await response.json();
            renderPosts(data.results || data);
        } catch (error) {
            console.error('Error:', error);
            // Показываем только не-401 ошибки
            if (!error.message.includes('401')) {
                alert(error.message);
            }
        }
    };

    // Отрисовка постов
    const renderPosts = (posts) => {
        if (!posts || posts.length === 0) {
            elements.postsContainer.innerHTML = '<p>Пока нет постов</p>';
            return;
        }

        elements.postsContainer.innerHTML = posts.map(post => `
            <div class="post" data-id="${post.id}">
                <div class="post-header">
                    <h3>${post.author}</h3>
                    ${post.can_edit ? `
                        <div class="post-actions">
                            <button class="edit-post-btn" data-id="${post.id}">✏️</button>
                            <button class="delete-post-btn" data-id="${post.id}">🗑️</button>
                        </div>
                    ` : ''}
                </div>
                <p class="post-text">${post.text}</p>
                ${post.images && post.images.length ? `
                    <div class="post-images">
                        ${post.images.map(img => `<img src="${img}" alt="Post image" style="max-width: 100%; height: auto;">`).join('')}
                    </div>
                ` : ''}
                <p class="post-date">${new Date(post.created_at).toLocaleString()}</p>
                <button class="like-btn" data-id="${post.id}" ${!localStorage.getItem('access_token') ? 'disabled' : ''}>
                    ❤️ ${post.likes_count} ${post.likes_count === 1 ? 'лайк' : 'лайков'}
                </button>
                <div class="comments">
                    <h4>Комментарии (${post.comments ? post.comments.length : 0})</h4>
                    ${(post.comments || []).map(comment => `
                        <div class="comment">
                            <strong>${comment.author}:</strong> ${comment.text}
                            <small>${new Date(comment.created_at).toLocaleString()}</small>
                        </div>
                    `).join('')}
                    ${localStorage.getItem('access_token') ? `
                        <form class="comment-form" data-id="${post.id}">
                            <input type="text" placeholder="Ваш комментарий" required>
                            <button type="submit">Отправить</button>
                        </form>
                    ` : '<p>Войдите, чтобы оставить комментарий</p>'}
                </div>
            </div>
        `).join('');

        // Назначение обработчиков
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', () => handleLike(btn.dataset.id));
        });

        document.querySelectorAll('.comment-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = form.querySelector('input');
                handleComment(form.dataset.id, input.value);
                input.value = '';
            });
        });

        document.querySelectorAll('.edit-post-btn').forEach(btn => {
            btn.addEventListener('click', () => showEditForm(btn.dataset.id));
        });

        document.querySelectorAll('.delete-post-btn').forEach(btn => {
            btn.addEventListener('click', () => handleDeletePost(btn.dataset.id));
        });
    };

    // Создание поста
    const handleNewPost = async (e) => {
        e.preventDefault();
        const text = elements.newPostText.value.trim();
        const images = elements.newPostImages.files;

        if (!text) return alert('Введите текст поста');
        if (images.length > 10) return alert('Не более 10 изображений');

        const formData = new FormData();
        formData.append('text', text);
        Array.from(images).forEach(img => formData.append('images', img));

        try {
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error('Требуется авторизация');

            const response = await fetch(`${API_BASE_URL}/posts/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) throw new Error('Ошибка создания поста');

            elements.newPostText.value = '';
            elements.newPostImages.value = '';
            await fetchPosts();
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    // Показать форму редактирования
    const showEditForm = async (postId) => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error('Требуется авторизация');

            const response = await fetch(`${API_BASE_URL}/posts/${postId}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Ошибка загрузки поста');
            
            const post = await response.json();

            // Создать модальное окно
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h2>Редактировать пост</h2>
                    <form id="edit-post-form">
                        <textarea id="edit-post-text" required>${post.text}</textarea>
                        <div class="current-images">
                            <h4>Текущие изображения:</h4>
                            ${post.images && post.images.length ? 
                                post.images.map(img => `
                                    <div class="image-container">
                                        <img src="${img}" alt="Post image">
                                        <button type="button" class="delete-image-btn" data-url="${img}">Удалить</button>
                                    </div>
                                `).join('') : 
                                '<p>Нет изображений</p>'
                            }
                        </div>
                        <label for="edit-post-images">Добавить новые изображения:</label>
                        <input type="file" id="edit-post-images" accept="image/*" multiple>
                        <div class="modal-buttons">
                            <button type="submit">Сохранить</button>
                            <button type="button" class="cancel-edit">Отмена</button>
                        </div>
                    </form>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Обработчики для модального окна
            modal.querySelector('.cancel-edit').addEventListener('click', () => modal.remove());
            
            modal.querySelector('#edit-post-form').addEventListener('submit', (e) => {
                e.preventDefault();
                handleEditPost(postId, modal);
            });
            
            // Обработчики для удаления изображений
            modal.querySelectorAll('.delete-image-btn').forEach(btn => {
                btn.addEventListener('click', () => handleDeleteImage(postId, btn.dataset.url, modal));
            });
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    // Редактирование поста
    const handleEditPost = async (postId, modal) => {
        const text = modal.querySelector('#edit-post-text').value.trim();
        const images = modal.querySelector('#edit-post-images').files;
        
        if (!text) return alert('Введите текст поста');
        
        const formData = new FormData();
        formData.append('text', text);
        Array.from(images).forEach(img => formData.append('images', img));

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Ошибка редактирования поста');
            }
            
            modal.remove();
            await fetchPosts();
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    // Удаление изображения
    const handleDeleteImage = async (postId, imageUrl, modal) => {
        if (!confirm('Вы уверены, что хотите удалить это изображение?')) return;
        
        try {
            const token = localStorage.getItem('access_token');
            const imageName = imageUrl.split('/').pop();
            
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/delete_image/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ image_name: imageName })
            });
            
            if (!response.ok) throw new Error('Ошибка удаления изображения');
            
            // Обновляем форму редактирования
            modal.remove();
            await showEditForm(postId);
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    // Удаление поста
    const handleDeletePost = async (postId) => {
        if (!confirm('Вы уверены, что хотите удалить этот пост?')) return;
        
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Ошибка удаления поста');
            
            await fetchPosts();
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    // Лайк поста
    const handleLike = async (postId) => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error('Требуется авторизация');

            const response = await fetch(`${API_BASE_URL}/posts/${postId}/like/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Ошибка лайка');
            
            await fetchPosts();
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    // Добавление комментария
    const handleComment = async (postId, text) => {
        if (!text.trim()) return alert('Введите комментарий');
        
        try {
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error('Требуется авторизация');

            const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });
            
            if (!response.ok) throw new Error('Ошибка комментария');
            
            await fetchPosts();
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    // Авторизация
    const handleLogin = async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/token/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Ошибка авторизации');
            }

            const { access, refresh } = await response.json();
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            localStorage.setItem('username', username);
            
            // Скрыть формы авторизации
            elements.loginForm.classList.add('hidden');
            elements.registerForm.classList.add('hidden');
            await updateUI();
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    // Регистрация
    const handleRegister = async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(Object.values(errorData).join(', '));
            }

            alert('Регистрация успешна! Войдите в систему.');
            elements.loginForm.classList.remove('hidden');
            elements.registerForm.classList.add('hidden');
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    };

    // Выход из системы
    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('username');
        updateUI();
    };

    // Инициализация
    const init = () => {
        elements.newPostForm.addEventListener('submit', handleNewPost);
        elements.loginForm.addEventListener('submit', handleLogin);
        elements.registerForm.addEventListener('submit', handleRegister);
        elements.logoutBtn.addEventListener('click', handleLogout);
        
        elements.showLoginBtn.addEventListener('click', () => {
            elements.loginForm.classList.remove('hidden');
            elements.registerForm.classList.add('hidden');
        });
        
        elements.showRegisterBtn.addEventListener('click', () => {
            elements.registerForm.classList.remove('hidden');
            elements.loginForm.classList.add('hidden');
        });

        updateUI();
    };

    init();
});