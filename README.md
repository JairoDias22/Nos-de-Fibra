# Nós de Fibra

Sistema web de gestão do ponto de cultura **Nós de Fibra**, em Barreirinhas (MA), da comunidade de artesanato de fibra de buriti. Ele substitui a planilha de estoque e vendas por um aplicativo simples, com letras grandes e poucos passos, pensado para quem não tem costume com computador.

- Estoque das peças, com situação (disponível, estoque baixo, esgotado)
- Venda em 3 passos, com baixa automática no estoque e entrada no caixa
- Histórico de vendas, com cancelamento de uma venda feita por engano
- Dinheiro: o que entrou e o que saiu, com correção dos lançamentos anotados à mão
- Resumo por dia, semana, mês e ano, com gráficos
- Planilha em Excel para baixar, no mesmo modelo da planilha original
- Funciona no celular e no computador, e pode ser instalado na tela inicial

## Tecnologias

- Vite 7, React 19, TypeScript e Tailwind CSS 4
- React Router 7
- Supabase (Postgres e Auth), sem servidor próprio
- ExcelJS, para gerar a planilha no próprio navegador
- Hospedagem no Cloudflare (Workers com arquivos estáticos)

## Como rodar

1. Instale o Node.js (versão LTS).
2. Rode `npm install`.
3. Configure o Supabase (abaixo) e crie o arquivo `.env.local` a partir do `.env.example`.
4. Rode `npm run dev` e abra o endereço que aparecer (normalmente http://localhost:5173).

Para testar no celular, na mesma rede Wi-Fi, rode `npm run dev -- --host` e abra o endereço de rede mostrado no terminal.

Antes de publicar, rode `npm run build`. Ele confere os tipos e gera a pasta `dist`.

## Configurando o Supabase

1. Crie um projeto em supabase.com.
2. No SQL Editor, rode os arquivos nesta ordem:
   1. `supabase/migrations/0001_tabelas_iniciais.sql`
   2. `supabase/seed/importar_planilha.sql` (uma vez só, senão as peças duplicam)
   3. `supabase/migrations/0002_registrar_venda.sql`
   4. `supabase/migrations/0003_cancelar_venda.sql`
3. Em Authentication > Users, crie o usuário de acesso (e-mail e senha, com Auto Confirm User marcado) e desative o cadastro público de novos usuários.
4. Em Project Settings > API, copie a URL do projeto e a chave pública (anon/publishable) para o `.env.local`:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

A URL termina em `.supabase.co`, sem `/rest/v1/`. Use só a chave pública. A chave `service_role` nunca deve ser usada no projeto nem enviada ao GitHub.

## Publicando na internet (Cloudflare)

1. Suba o projeto para um repositório no GitHub (o `.env.local` nunca vai junto).
2. No painel do Cloudflare, crie um projeto do tipo Workers ligado ao repositório.
3. Configure:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - Em Settings > Build > Build variables and secrets, crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os mesmos valores do `.env.local`.
4. A pasta do site e a regra para o React Router ficam no `wrangler.jsonc` (`assets.directory = ./dist` e `not_found_handling = single-page-application`).
5. A cada `git push` na branch `main`, o site é publicado de novo.

As variáveis `VITE_*` são gravadas na hora do build. Se mudarem, é preciso refazer o build.

## Instalando no celular

Abra o endereço do site no navegador do celular e use "Adicionar à tela inicial" (Chrome no Android; Compartilhar > Adicionar à Tela de Início no iPhone).

## Como o estoque funciona

O saldo de cada peça não é um número digitado: ele é a soma dos movimentos (entrada, saída e ajuste). Por isso:

- uma venda faz uma saída no estoque e uma entrada no Dinheiro, tudo junto (função `registrar_venda`);
- cancelar uma venda devolve a peça e tira o valor do Dinheiro, tudo junto (função `cancelar_venda`);
- «Corrigir a contagem» grava um ajuste com a diferença;
- peças tiradas da lista ficam guardadas (`ativo = false`), nunca são apagadas.

## Planilha

O botão «Baixar planilha», na tela Início, gera um arquivo Excel com três abas: Lista de estoque (igual à planilha original, com as mesmas fórmulas, regras de preenchimento e cores), Vendas e Dinheiro.

O sistema é a fonte da verdade. A planilha é só uma cópia, sempre do sistema para a planilha: mudanças feitas nela não voltam para o sistema.

## Estrutura

```
src/
  auth/         sessão do Supabase
  components/   menus, cabeçalho das telas, gráficos, botão da planilha, ações do estoque
  lib/          Supabase, formatação, períodos do Resumo, geração da planilha
  pages/        Login, Inicio, Vender, Vendas, Estoque, Dinheiro, Resumo
  styles/       tema (cores e fonte) e classes de cartão
  types/        tipos compartilhados
supabase/
  migrations/   tabelas e funções do banco (rodar em ordem)
  seed/         carga inicial a partir da planilha original
public/         ícones, logo e manifesto do aplicativo
```

## Histórico das versões

- Parte 1: base do projeto, tema, menu responsivo e tela inicial.
- Parte 2: banco de dados, login, rotas protegidas e lista de estoque com saldo e busca.
- Parte 3: tela Vender, com baixa automática no estoque e entrada no caixa.
- Parte 4: tela Dinheiro (entradas e saídas do mês, totais e navegação entre meses).
- Parte 5: cadastro de peças, edição, entrada de estoque, correção de contagem e remoção da lista.
- Parte 6: tela Resumo com vendas, comparação com o período anterior, peças mais vendidas e rendimento por tipo.
- Parte 7: ícones e manifesto para instalar no celular e publicação na internet.
- Parte 8: Estoque separado por tipo de peça e Vender em 3 passos.
- Parte 9: visual claro e profissional, Estoque em tabela com ordenação e Resumo por dia, semana, mês e ano.
- Parte 10: logo do Nós de Fibra e botão para baixar a planilha em Excel.
- Parte 11: tela Vendas feitas, com cancelamento de venda.
- Parte 12: correção de lançamentos do Dinheiro anotados à mão.

## Ideias para o futuro

Foto de cada peça, relatório mensal em PDF, vendas com mais de um item, clientes e encomendas.
