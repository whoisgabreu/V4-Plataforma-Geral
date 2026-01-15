from flask import Flask, render_template, request, redirect, url_for, session, jsonify
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
            print(usuario, senha, response.json())
            
            db_nome = response.json()[0].get("user").get("nome")
            db_email = response.json()[0].get("user").get("email")
            db_funcao = response.json()[0].get("user").get("funcao")
            db_senioridade = response.json()[0].get("user").get("senioridade")
            db_squad = response.json()[0].get("user").get("squad")
            db_senha = response.json()[0].get("user").get("senha")
            db_acesso = response.json()[0].get("user").get("nivel_acesso")

            if senha == db_senha:
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

def agrupar_por_cliente(projetos_lista):
    """Agrupa projetos por nome do cliente"""
    clientes = defaultdict(list)
    for item in projetos_lista:
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

    resp = req.get("https://n8n.v4lisboatech.com.br/webhook/squads?email=martins.gabriel@v4company.com", headers= {"x-api-key": "4815162342"})
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


if __name__ == "__main__":
    app.run(debug=True)