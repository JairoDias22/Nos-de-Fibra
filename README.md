# Nós de Fibra

Sistema de gestão do ponto de cultura Nós de Fibra (estoque, vendas e dinheiro).

## Como rodar

1. Instale o Node.js (versão LTS).
2. Rode `npm install`.
3. Configure o Supabase (abaixo) e crie o arquivo `.env.local` a partir do `.env.example`.
4. Rode `npm run dev` e abra o endereço que aparecer (normalmente http://localhost:5173).

Para testar no celular, na mesma rede Wi-Fi, rode `npm run dev -- --host` e abra o endereço de rede mostrado no terminal.

## Configurando o Supabase

1. Crie um projeto em supabase.com.
2. No SQL Editor, rode o arquivo `supabase/migrations/0001_tabelas_iniciais.sql`, depois `supabase/seed/importar_planilha.sql` (uma vez só) e por fim `supabase/migrations/0002_registrar_venda.sql`.
3. Em Authentication > Users, crie o usuário de acesso (e-mail e senha) e desative o cadastro público de novos usuários.
4. Em Project Settings > API, copie a URL do projeto e a chave pública (anon/publishable) para o `.env.local`.

## Estado atual

- Parte 1: base do projeto, tema, menu responsivo e tela inicial.
- Parte 2: banco de dados, login, rotas protegidas e lista de estoque real com saldo e busca.
- Parte 3: tela Vender (escolher a peça, quantidade, preço, desconto, data e local), com baixa automática no estoque e entrada no caixa.
- Parte 4: tela Dinheiro (entradas e saídas do mês, totais, anotar gastos e outras entradas, navegação entre meses).
