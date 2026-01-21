let currentSlide = 'ativos';
let currentClientData = null;
let currentProjectData = null;
let isEditMode = false;

/* ==============================
UTILITÁRIOS DE MOEDA (NOVO)
================================ */

function formatCurrency(value, currency) {
    if (value === null || value === undefined || value === '') return '';

    const number = Number(value);
    if (isNaN(number)) return '';

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency || 'BRL'
    }).format(number / 100);
}

function parseCurrencyToCents(value) {
    if (!value) return 0;

    let clean = value.replace(/[^\d.,]/g, '');

    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');

    if (lastComma > lastDot) {
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
        clean = clean.replace(/,/g, '');
    }

    const number = parseFloat(clean);
    return isNaN(number) ? 0 : Math.round(number * 100);
}

/* ==============================
TABS / FILTRO
================================ */

function switchTab(ev, tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    ev.currentTarget.classList.add('active');

    document.querySelectorAll('.slide-content').forEach(slide => slide.classList.remove('active'));
    document.getElementById(`slide-${tab}`).classList.add('active');

    currentSlide = tab;
    filterClients();
}

function filterClients() {
    const searchValue = document.getElementById('searchInput').value.toLowerCase();
    const activeSlide = document.querySelector('.slide-content.active');
    const cards = activeSlide.querySelectorAll('.project-card');

    cards.forEach(card => {
        const clientName = (card.getAttribute('data-cliente') || '').toLowerCase();
        card.style.display = clientName.includes(searchValue) ? 'block' : 'none';
    });
}

/* ==============================
MODAL CLIENTE
================================ */

function openClientModal(cardElement) {
    const projetos = JSON.parse(cardElement.getAttribute('data-projetos'));
    const clienteNome = cardElement.querySelector('.project-title').textContent;
    const tipo = cardElement.getAttribute('data-tipo');

    currentClientData = { nome: clienteNome, projetos, tipo };

    document.getElementById('clientModalTitle').textContent = `Projetos de ${clienteNome}`;

    const projectsList = document.getElementById('projectsList');
    projectsList.innerHTML = '';

    projetos.forEach(projeto => {
        const feeFormatado = formatCurrency(projeto.fee, projeto.moeda);

        const projectItem = document.createElement('div');
        projectItem.className = 'project-list-item';
        projectItem.innerHTML = `
            <div class="project-item-info">
                <h4>${projeto.produto_contratado || 'Sem nome'}</h4>
                <p>
                    Squad: ${projeto.squad_atribuida || 'N/A'} |
                    Fee: ${feeFormatado || '—'}
                </p>
            </div>
            <button class="btn-view">
                <i class="fa-solid fa-eye"></i> Ver Detalhes
            </button>
        `;

        projectItem.querySelector('.btn-view').addEventListener('click', (e) => {
            e.stopPropagation();
            openProjectModal(projeto, tipo);
        });

        projectsList.appendChild(projectItem);
    });

    document.getElementById('clientModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeClientModal() {
    document.getElementById('clientModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    currentClientData = null;
}

/* ==============================
MODAL PROJETO
================================ */

function openProjectModal(projectData, tipoProjeto) {
    currentProjectData = projectData;
    isEditMode = false;
    setEditMode(false);

    document.getElementById('projectModalTitle').textContent =
        projectData.nome || 'Detalhes do Projeto';

    document.getElementById('modal_projeto_id').value = projectData.id || '';
    document.getElementById('modal_tipo_projeto').value = tipoProjeto || '';
    document.getElementById('modal_nome').value = projectData.nome || '';
    document.getElementById('modal_pipefy_id').value = projectData.pipefy_id || '';
    document.getElementById('modal_documento').value = projectData.documento || '';

    // ✅ Fee formatado (agora funciona)
    document.getElementById('modal_fee').value =
        formatCurrency(projectData.fee, projectData.moeda);

    document.getElementById('modal_moeda').value = projectData.moeda || 'BRL';
    document.getElementById('modal_squad').value = projectData.squad_atribuida || '';
    document.getElementById('modal_produto').value = projectData.produto_contratado || '';
    document.getElementById('modal_step').value = projectData.step || '';
    document.getElementById('modal_informacoes').value = projectData.informacoes_gerais || '';
    document.getElementById('modal_cohort').value = projectData.cohort || '';
    document.getElementById('modal_meta_account').value = projectData.meta_account_id || '';
    document.getElementById('modal_google_account').value = projectData.google_account_id || '';
    document.getElementById('modal_orcamento_midia_meta').value = projectData.orcamento_midia_meta || '';
    document.getElementById('modal_orcamento_midia_google').value = projectData.orcamento_midia_google || '';
    document.getElementById('modal_fase_pipefy').value = projectData.fase_do_pipefy || '';
    document.getElementById('modal_webhook_url').value = projectData.url_webhook_gchat || '';

    if (projectData.data_de_inicio) {
        document.getElementById('modal_data_inicio').value =
            String(projectData.data_de_inicio).split('T')[0];
    } else {
        document.getElementById('modal_data_inicio').value = '';
    }

    document.getElementById('clientModal').classList.remove('active');
    document.getElementById('projectModal').classList.add('active');
}

function closeProjectModal() {
    document.getElementById('projectModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    currentProjectData = null;
    isEditMode = false;
    setEditMode(false);
}

function backToClientModal() {
    document.getElementById('projectModal').classList.remove('active');
    if (currentClientData) {
        document.getElementById('clientModal').classList.add('active');
    }
    isEditMode = false;
    setEditMode(false);
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    setEditMode(isEditMode);
}

function setEditMode(enable) {
    const inputs = document.querySelectorAll('#projectForm input, #projectForm select, #projectForm textarea');
    inputs.forEach(input => {
        if (input.id !== 'modal_projeto_id' && input.id !== 'modal_tipo_projeto') {
            input.disabled = !enable;
        }
    });

    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');

    if (!editBtn || !saveBtn) return;

    saveBtn.style.display = enable ? 'inline-flex' : 'none';
    editBtn.innerHTML = enable
        ? '<i class="fa-solid fa-xmark"></i> Cancelar'
        : '<i class="fa-solid fa-pen-to-square"></i> Editar';
}

/* ==============================
UPDATE PROJETO
================================ */

async function updateProject(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    // ✅ NORMALIZA MOEDA
    data.fee = parseCurrencyToCents(data.fee);

    try {
        const response = await fetch('https://n8n.v4lisboatech.com.br/webhook/update_projeto', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': '4815162342'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeProjectModal();
            location.reload();
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

/* ==============================
MENU USUÁRIO / SENHA
================================ */

function toggleUserMenu(event) {
    event.stopPropagation();
    document.getElementById('userDropdown').classList.toggle('active');
}

document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('userDropdown');
    const menuBtn = document.getElementById('userMenuBtn');

    if (dropdown.classList.contains('active') &&
        !dropdown.contains(event.target) &&
        !menuBtn.contains(event.target)) {
        dropdown.classList.remove('active');
    }
});

function openManageUsers() {
    window.location.href = '/manage_users';
}

function openMyProfile() {
    alert('Meu Perfil - Em desenvolvimento');
}

function changePassword() {
    document.getElementById('passwordModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    document.getElementById('passwordForm').reset();
}

async function updatePassword(event) {
    event.preventDefault();

    const novaSenha = document.getElementById('nova_senha').value;
    const confirmarSenha = document.getElementById('confirmar_senha').value;

    if (novaSenha !== confirmarSenha) {
        alert('As senhas não coincidem!');
        return;
    }

    if (novaSenha.length < 6) {
        alert('A senha deve ter no mínimo 6 caracteres!');
        return;
    }

    try {
        const response = await fetch('https://n8n.v4lisboatech.com.br/webhook/update_user_info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': '4815162342'
            },
            body: JSON.stringify({
                email: window.APP_CONFIG.userEmail,
                senha: novaSenha,
                switch: 'user_password'
            })
        });

        if (response.ok) {
            alert('Senha atualizada com sucesso!');
            closePasswordModal();
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

window.addEventListener('click', function(event) {
    const passwordModal = document.getElementById('passwordModal');
    if (event.target === passwordModal) {
        closePasswordModal();
    }
});