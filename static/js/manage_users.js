let squads = [];

// Carregar squads ao iniciar
document.addEventListener('DOMContentLoaded', async () => {
    await loadSquads();
    attachEventListeners();
});

function attachEventListeners() {
    // Event delegation para botões de ação
    document.querySelectorAll('.btn-action').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const action = this.getAttribute('data-action');
            const row = this.closest('tr');
            
            if (action === 'edit') {
                const userData = JSON.parse(row.getAttribute('data-user-json'));
                editUser(userData);
            } else if (action === 'toggle') {
                const userId = this.getAttribute('data-user-id');
                const currentStatus = this.getAttribute('data-user-status') === 'true';
                toggleUserStatus(userId, currentStatus);
            }
        });
    });
}

async function loadSquads() {
    try {
        const response = await fetch('https://n8n.v4lisboatech.com.br/webhook/list_squads', {
            headers: { 'x-api-key': '4815162342' }
        });
        
        if (response.ok) {
            const data = await response.json();
            squads = data;
            
            const select = document.getElementById('user_squad');
            select.innerHTML = '<option value="">Selecione...</option>';

            squads.forEach(squad => {
                const option = document.createElement('option');
                option.value = squad.projetos || squad;
                option.textContent = squad.projetos || squad;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar squads:', error);
        document.getElementById('user_squad').innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

function filterUsers() {
    const searchValue = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('.user-row');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchValue) ? '' : 'none';
    });
}

function openCreateUserModal() {
    document.getElementById('modalTitle').textContent = 'Novo Usuário';
    document.getElementById('is_edit').value = 'false';
    document.getElementById('userForm').reset();
    document.getElementById('user_ativo').checked = true;
    // document.getElementById('user_senha').setAttribute('required', '');
    // document.getElementById('user_confirmar_senha').setAttribute('required', '');
    document.getElementById('userModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function editUser(userData) {
    document.getElementById('modalTitle').textContent = 'Editar Usuário';
    document.getElementById('is_edit').value = 'true';
    document.getElementById('user_id').value = userData.id || '';
    document.getElementById('user_nome').value = userData.nome || '';
    document.getElementById('user_email').value = userData.email || '';
    document.getElementById('user_funcao').value = userData.funcao || '';
    document.getElementById('user_senioridade').value = userData.senioridade || '';
    document.getElementById('user_squad').value = userData.squad || '';
    document.getElementById('user_nivel_acesso').value = userData.nivel_acesso || '';
    // document.getElementById('user_senha').removeAttribute('required');
    // document.getElementById('user_confirmar_senha').removeAttribute('required');
    // document.getElementById('user_senha').value = '';
    // document.getElementById('user_confirmar_senha').value = '';
    document.getElementById('user_ativo').checked = userData.ativo !== false;
    
    document.getElementById('userModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    document.getElementById('userForm').reset();
}

async function saveUser(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    const isEdit = data.is_edit === 'true';
    
    // Se é criação, define senha padrão
    if (!isEdit) {
        data.senha = '123456';
    } else {
        // Se é edição, validar senhas apenas se foram preenchidas
        if (data.senha || data.confirmar_senha) {
            if (data.senha !== data.confirmar_senha) {
                alert('As senhas não coincidem!');
                return;
            }
        } else {
            // Se senha não foi preenchida na edição, remover do objeto
            delete data.senha;
        }
    }
    
    // Converter checkbox para boolean
    data.ativo = document.getElementById('user_ativo').checked;
    
    // Remover campos desnecessários
    delete data.confirmar_senha;
    delete data.is_edit;
    
    // Definir o switch apropriado
    data.switch = isEdit ? 'user_info' : 'create_user';
    
    try {
        const response = await fetch('https://n8n.v4lisboatech.com.br/webhook/update_user_info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': '4815162342'
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            alert(isEdit ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso! Senha padrão: 123456');
            closeUserModal();
            location.reload();
        } else {
            const error = await response.text();
            alert('Erro ao salvar usuário: ' + error);
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}
async function toggleUserStatus(userId, currentStatus) {
    const newStatus = !currentStatus;
    const action = newStatus ? 'ativar' : 'desativar';
    
    if (!confirm(`Deseja ${action} este usuário?`)) {
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
                user_id: userId, 
                ativo: newStatus, 
                switch: 'status' 
            })
        });
        
        if (response.ok) {
            location.reload();
        } else {
            alert('Erro ao alterar status do usuário');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}

window.onclick = function(event) {
    const modal = document.getElementById('userModal');
    if (event.target === modal) {
        closeUserModal();
    }
}