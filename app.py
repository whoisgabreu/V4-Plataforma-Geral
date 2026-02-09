from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory
import requests as req
import os
from collections import defaultdict

app = Flask(__name__)
app.secret_key = os.urandom(10).hex() 


@app.route("/login", methods = ["GET","POST"])
def login():
    if request.method == "POST":
        usuario = request.form["email"]
        senha = request.form["senha"]

        if usuario and senha:
            response = req.get("https://n8n.v4lisboatech.com.br/webhook/check_login", headers={"x-api-key": "4815162342"}, params = {"email": usuario})

            if response.status_code == 401:
                return render_template("login.html", error = "E-mail e/ou Senha incorreto(s).")
            
            print(usuario, senha, response.json())

            
            db_nome = response.json()[0].get("user").get("nome")
            db_email = response.json()[0].get("user").get("email")
            db_funcao = response.json()[0].get("user").get("funcao")
            db_senioridade = response.json()[0].get("user").get("senioridade")
            db_squad = response.json()[0].get("user").get("squad")
            db_senha = response.json()[0].get("user").get("senha")
            db_acesso = response.json()[0].get("user").get("nivel_acesso")
            db_ativo = response.json()[0].get("user").get("ativo")

            if db_ativo is not True:
                return render_template("login.html", error = "Login inativo. Fale com a Gerência.")

            if senha != db_senha:
                return render_template("login.html", error = "E-mail e/ou Senha incorreto(s).")

            session["nome"] = db_nome
            session["email"] = db_email
            session["funcao"] = db_funcao
            session["senioridade"] = db_senioridade
            session["squad"] = db_squad
            session["nivel_acesso"] = db_acesso
            return redirect(url_for("home"))

    return render_template("login.html")

@app.route("/logout", methods = ["GET"])
def logout():
    session.clear()
    return redirect(url_for("login"))

# def agrupar_por_cliente(projetos_lista):
#     """Agrupa projetos por nome do cliente"""
#     clientes = defaultdict(list)
#     for item in projetos_lista:
#         projeto = item.get('projetos', {})
#         cliente_nome = projeto.get('nome', 'Cliente Desconhecido')
#         clientes[cliente_nome].append(projeto)
#         # squad_atribuida = projeto.get("squad_atribuida", "N/A")
#         # clientes[cliente_nome].append(squad_atribuida)

#     return dict(clientes)

def agrupar_por_cliente(projetos_lista):
    """Agrupa projetos por nome do cliente, ordenados por id"""

    # ordena a lista pelo campo id
    projetos_ordenados = sorted(
        projetos_lista,
        key=lambda item: item.get('projetos', {}).get('id', 0)
    )

    clientes = defaultdict(list)

    for item in projetos_ordenados:
        projeto = item.get('projetos', {})
        cliente_nome = projeto.get('nome', 'Cliente Desconhecido')
        clientes[cliente_nome].append(projeto)

    return dict(clientes)

def buscar_projetos(url, email):
    """Busca projetos com tratamento de erro"""
    try:
        response = req.get(url, headers={"x-api-key": "4815162342"}, params={"email": email}, timeout=10)
        
        # Verifica se a resposta tem conteúdo
        if response.status_code == 200 and response.text.strip():
            try:
                return response.json()
            except ValueError:
                print(f"Erro ao parsear JSON de {url}")
                return []
        else:
            print(f"Resposta vazia ou erro de {url}: status {response.status_code}")
            return []
            
    except req.exceptions.RequestException as e:
        print(f"Erro na requisição para {url}: {e}")
        return []

@app.route("/", methods = ["GET"])
def home():
    if "nome" not in session:
        return redirect(url_for("login"))

    # Buscar projetos com tratamento de erro
    

    resp = req.get(f"https://n8n.v4lisboatech.com.br/webhook/squads?email={session["email"]}", headers= {"x-api-key": "4815162342"})
    squads = [x["projetos"]["nome"] for x in resp.json()]

    ativos_data = buscar_projetos(
        "https://n8n.v4lisboatech.com.br/webhook/list_projetos",
        session["email"]
    )
    ativos = agrupar_por_cliente(ativos_data) if ativos_data else {}

    onetime_data = buscar_projetos(
        "https://n8n.v4lisboatech.com.br/webhook/list_projetos_onetime",
        session["email"]
    )
    onetime = agrupar_por_cliente(onetime_data) if onetime_data else {}

    inativos_data = buscar_projetos(
        "https://n8n.v4lisboatech.com.br/webhook/list_projetos_inativos",
        session["email"]
    )
    inativos = agrupar_por_cliente(inativos_data) if inativos_data else {}

    return render_template("home.html", 
                         clientes_ativos = ativos, 
                         clientes_onetime = onetime, 
                         clientes_inativos = inativos,
                         squads = squads)

@app.template_filter('format_date')
def format_date(date_str):
    if not date_str:
        return 'N/A'
    date_part = date_str.split('T')[0]
    year, month, day = date_part.split('-')
    return f'{day}/{month}/{year}'

@app.route("/manage_users", methods=["GET"])
def manage_users():
    if "nome" not in session:
        return redirect(url_for("login"))
    
    # Verificar se é gerência
    if session.get("nivel_acesso") != "Admin":
        return redirect(url_for("home"))
    
    # Buscar usuários
    try:
        response = req.get(
            "https://n8n.v4lisboatech.com.br/webhook/list_users",
            headers={"x-api-key": "4815162342"},
            timeout=10
        )
        
        if response.status_code == 200 and response.text.strip():
            usuarios = response.json()
            # Garantir que é uma lista
            if not isinstance(usuarios, list):
                usuarios = []
        else:
            usuarios = []
    except Exception as e:
        print(f"Erro ao buscar usuários: {e}")
        usuarios = []
    
    return render_template("manage_users.html", usuarios=usuarios)

@app.route('/service-worker.js')
def service_worker():
    return send_from_directory('static', 'service-worker.js')

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)