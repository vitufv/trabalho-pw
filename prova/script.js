// Estado da aplicação (guarda os dados dos voluntários e endereço)
const state = {
    volunteers: [],
    address: null
};

// Atalhos para selecionar elementos da página
const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

// Verifica se o usuário está autenticado
function checkAuth() {
    return localStorage.getItem('isAuthenticated') === 'true';
}

// Faz o login com usuário e senha
function login(username, password) {
    if (username === 'admin' && password === 'admin123') {
        localStorage.setItem('isAuthenticated', 'true');
        return true;
    }
    return false;
}

// Mostra a tela escolhida (login ou sistema)
function showScreen(screenId) {
    $$('.screen').forEach(s => s.classList.toggle('hidden', s.id !== screenId));
}

// Troca entre as seções (cadastro ou lista)
function switchView(viewId) {
    $$('main').forEach(m => m.classList.toggle('hidden', m.id !== viewId));
    $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.screen === viewId));
}

// Carrega os voluntários salvos no navegador
function loadVolunteers() {
    state.volunteers = JSON.parse(localStorage.getItem('volunteers') || '[]');
    updateUI();
}

// Salva os voluntários no navegador
function saveVolunteers() {
    localStorage.setItem('volunteers', JSON.stringify(state.volunteers));
    updateUI();
}

// Atualiza a quantidade de voluntários e mostra os cards
function updateUI() {
    $('.volunteer-count').textContent = `${state.volunteers.length} voluntário${state.volunteers.length !== 1 ? 's' : ''} cadastrado${state.volunteers.length !== 1 ? 's' : ''}`;
    renderVolunteers();
}

// Cria e mostra os cards dos voluntários
function renderVolunteers(filtered = state.volunteers) {
    const grid = $('#volunteerGrid');
    grid.innerHTML = filtered.length ? filtered.map(createVolunteerCard).join('') : 
        '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#666">Nenhum voluntário cadastrado.</div>';
    
    // Adiciona função de excluir em cada botão
    $$('.delete-btn').forEach(btn => {
        btn.onclick = () => deleteVolunteer(btn.dataset.id);
    });
}

// Gera o card com os dados do voluntário
function createVolunteerCard(volunteer) {
    return `
        <div class="volunteer-card">
            <div class="card-content">
                <div class="card-header">
                    <img src="${volunteer.profileImage}" alt="Foto de ${volunteer.name}" 
                         class="profile-image" 
                         onerror="this.src='https://source.unsplash.com/160x160/?volunteer'">
                    <div>
                        <h3>${volunteer.name}</h3>
                        <div>${volunteer.email}</div>
                    </div>
                </div>
                <div class="volunteer-address">
                    <p>${volunteer.logradouro}</p>
                    <p>${volunteer.bairro ? `${volunteer.bairro}, ` : ''}${volunteer.localidade} - ${volunteer.uf}</p>
                </div>
            </div>
            <div class="card-actions">
                <button class="delete-btn" data-id="${volunteer.id}">Excluir</button>
            </div>
        </div>
    `;
}

// Exclui um voluntário da lista
function deleteVolunteer(id) {
    if (confirm('Tem certeza que deseja excluir este voluntário?')) {
        state.volunteers = state.volunteers.filter(v => v.id !== id);
        saveVolunteers();
    }
}

// Busca o endereço pelo CEP usando a API ViaCep
async function fetchAddress(cep) {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) throw new Error('CEP deve ter 8 dígitos');
    
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    
    if (data.erro) throw new Error('CEP não encontrado');
    return data;
}

// Quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        showScreen('appScreen');
        loadVolunteers();
    }
});

// Quando o formulário de login for enviado
$('#loginForm').onsubmit = (e) => {
    e.preventDefault();
    const username = $('#username').value;
    const password = $('#password').value;
    
    if (login(username, password)) {
        showScreen('appScreen');
        loadVolunteers();
    } else {
        alert('Usuário ou senha inválidos');
    }
};

// Quando clicar em sair
$('#logoutBtn').onclick = () => {
    localStorage.removeItem('isAuthenticated');
    showScreen('loginScreen');
};

// Navegação entre as seções
$$('[data-screen]').forEach(el => {
    el.onclick = () => switchView(el.dataset.screen);
});

// Busca na lista de voluntários
$('#searchInput').oninput = (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = state.volunteers.filter(v => 
        v.name.toLowerCase().includes(term)
    );
    renderVolunteers(filtered);
};

// Limpa todos os voluntários
$('#clearAllBtn').onclick = () => {
    if (state.volunteers.length && confirm('Limpar todos os registros?')) {
        state.volunteers = [];
        saveVolunteers();
    }
};

// Recarrega a lista
$('#refreshBtn').onclick = loadVolunteers;

// Quando digita o CEP, busca o endereço
let cepTimeout;
$('#cep').oninput = (e) => {
    clearTimeout(cepTimeout);
    const cep = e.target.value.replace(/\D/g, '');
    
    if (cep.length === 8) {
        cepTimeout = setTimeout(async () => {
            $('.cep-loader').classList.remove('hidden');
            try {
                state.address = await fetchAddress(cep);
                $('#addressText').textContent = `${state.address.logradouro}${state.address.bairro ? `, ${state.address.bairro}` : ''}, ${state.address.localidade} - ${state.address.uf}`;
                $('#addressInfo').classList.remove('hidden');
            } catch (error) {
                $('#addressInfo').classList.add('hidden');
                alert(error.message);
            } finally {
                $('.cep-loader').classList.add('hidden');
            }
        }, 500);
    }
};

// Quando o formulário de cadastro for enviado
$('#registrationForm').onsubmit = async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const cep = form.cep.value.replace(/\D/g, '');
    
    if (!name || !email || !cep || !state.address) {
        alert('Preencha todos os campos corretamente');
        return;
    }
    
    const volunteer = {
        id: Date.now().toString(),
        name,
        email,
        cep,
        ...state.address,
        profileImage: `https://source.unsplash.com/160x160/?${encodeURIComponent(name.split(' ')[0])}`
    };
    
    state.volunteers.push(volunteer);
    saveVolunteers();
    alert('Voluntário cadastrado com sucesso!');
    form.reset();
    $('#addressInfo').classList.add('hidden');
    switchView('volunteerList');
};
