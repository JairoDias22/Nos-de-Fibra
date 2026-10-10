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
- Parte 5: cadastro de peças novas, edição, entrada de estoque, correção de contagem e remoção da lista, tudo na tela Estoque.
- Parte 6: tela Resumo com vendas do mês, comparação com o mês anterior, gráficos por dia, peças mais vendidas, rendimento por tipo e peças acabando.
- Parte 7: ícones e manifesto para instalar no celular como aplicativo e configuração de publicação na Vercel.

## Publicando na internet (Vercel)

1. Suba o projeto para um repositório no GitHub (o `.env.local` nunca vai junto).
2. Em vercel.com, entre com o GitHub, clique em Add New > Project e escolha o repositório.
3. O Vercel reconhece o Vite sozinho. Antes de publicar, abra Environment Variables e crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os mesmos valores do `.env.local`.
4. Clique em Deploy. A cada `git push` na branch `main`, o site é atualizado automaticamente.
5. No Supabase, em Authentication, deixe desligado o cadastro público de novos usuários.

## Instalando no celular

Abra o endereço do site no navegador do celular e use "Adicionar à tela inicial" (Chrome no Android, Compartilhar > Adicionar à Tela de Início no iPhone).
- Parte 8: visual reorganizado. Estoque separado por tipo de peça (e por modelo e tamanho), Vender em 3 passos (tipo, peça, venda) e uma faixa colorida no topo de cada tela, na mesma cor do botão dela na página inicial.
- Parte 9: visual claro e profissional (menu lateral branco, cartões com borda fina), Estoque em tabela estilo planilha com ordenação, filtro por tipo e botão «Por grupo», e Resumo com escolha de Dia, Semana, Mês e Ano e gráfico de colunas por dia.

