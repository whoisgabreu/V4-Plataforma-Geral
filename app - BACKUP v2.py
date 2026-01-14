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

            if senha == db_senha:
                session["nome"] = db_nome
                session["email"] = db_email
                session["funcao"] = db_funcao
                session["senioridade"] = db_senioridade
                session["squad"] = db_squad
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

@app.route("/", methods = ["GET"])
def home():
    if "nome" not in session:
        return redirect(url_for("login"))

    # Buscar projetos
    response = req.get("https://n8n.v4lisboatech.com.br/webhook/list_projetos", headers = {"x-api-key": "4815162342"}, params = {"email": session["email"]})
    ativos = agrupar_por_cliente(response.json())

    response = req.get("https://n8n.v4lisboatech.com.br/webhook/list_projetos_onetime", headers = {"x-api-key": "4815162342"}, params = {"email": session["email"]})
    onetime = agrupar_por_cliente(response.json())

    response = req.get("https://n8n.v4lisboatech.com.br/webhook/list_projetos_inativos", headers = {"x-api-key": "4815162342"}, params = {"email": session["email"]})
    inativos = agrupar_por_cliente(response.json())

    return render_template("home.html", 
                         clientes_ativos = ativos, 
                         clientes_onetime = onetime, 
                         clientes_inativos = inativos)


@app.template_filter('format_date')
def format_date(date_str):
    if not date_str:
        return 'N/A'
    date_part = date_str.split('T')[0]
    year, month, day = date_part.split('-')
    return f'{day}/{month}/{year}'


if __name__ == "__main__":
    app.run(debug=True)