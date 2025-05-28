// js/catalogo.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://zjjvzouaalphxenypomp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqanZ6b3VhYWxwaHhlbnlwb21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1NDU0MzMsImV4cCI6MjA2MTEyMTQzM30.V846ghEfXW7D1DegBovnzW7i8T27gdzmygWXOiS7SxQ';
const supabase = createClient(supabaseUrl, supabaseKey);

const TABELA_PRODUTOS = 'produtos';

// Elementos do DOM
const inputBuscaProduto = document.getElementById('buscaProduto');
const selectFiltroCategoria = document.getElementById('filtroCategoria');
const btnAplicarFiltros = document.getElementById('btnAplicarFiltros');
const divListaCatalogoProdutos = document.getElementById('lista-catalogo-produtos');
const pNenhumProduto = document.getElementById('nenhum-produto-encontrado');
const feedbackCatalogoDiv = document.getElementById('feedback-catalogo');

/* --- Helpers de UI ---------------------------------------------------- */
function exibirMensagemFeedbackCatalogo(msg, tipo = 'sucesso', ms = 3000) {
  if (!feedbackCatalogoDiv) return;
  feedbackCatalogoDiv.textContent = msg;
  feedbackCatalogoDiv.className = 'mb-6 p-3 rounded-lg text-sm transition-all duration-300'; // Limpa classes
  const cores = {
    sucesso: ['bg-green-100', 'text-green-700'],
    erro:   ['bg-red-100',   'text-red-700'],
    aviso:  ['bg-yellow-100','text-yellow-700']
  };
  feedbackCatalogoDiv.classList.add(...cores[tipo]);
  feedbackCatalogoDiv.classList.remove('hidden');
  if (ms > 0) {
    setTimeout(() => feedbackCatalogoDiv.classList.add('hidden'), ms);
  }
}

/* --- Lógica do Catálogo ----------------------------------------------- */

// Carrega opções para o filtro de categoria
async function carregarOpcoesFiltroCategoria() {
  // Esta query busca todos os produtos para extrair categorias distintas.
  // Para performance em tabelas muito grandes, seria melhor ter uma tabela de categorias separada
  // ou usar uma função RPC no Supabase para buscar valores distintos.
  const { data, error } = await supabase
    .from(TABELA_PRODUTOS)
    .select('categoria'); // Seleciona apenas a coluna categoria

  if (error) {
    console.error('Erro ao carregar categorias:', error);
    return;
  }

  if (data) {
    // Pega valores únicos de categoria, filtra nulos/vazios, e ordena
    const categoriasUnicas = [...new Set(data.map(item => item.categoria).filter(Boolean))].sort();
    
    categoriasUnicas.forEach(categoria => {
      const option = document.createElement('option');
      option.value = categoria;
      option.textContent = categoria;
      selectFiltroCategoria.appendChild(option);
    });
  }
}

// Busca produtos no Supabase com base nos filtros e termo de busca
async function fetchProdutosCatalogo(termoBusca = '', categoriaFiltro = '') {
  exibirMensagemFeedbackCatalogo('Buscando produtos...', 'aviso', 2000);
  let query = supabase
    .from(TABELA_PRODUTOS)
    // IMPORTANTE: Selecione APENAS as colunas públicas. NÃO inclua 'preco' ou 'quantidade'.
    .select('id, nome, descricao, imagem_url, categoria'); // Adicione outros campos públicos se necessário

  if (termoBusca) {
    // Busca pelo nome do produto (case-insensitive)
    query = query.ilike('nome', `%${termoBusca}%`);
  }
  if (categoriaFiltro) {
    query = query.eq('categoria', categoriaFiltro);
  }

  // Ordenação padrão para o catálogo (ex: por nome)
  query = query.order('nome', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar produtos para o catálogo:', error);
    exibirMensagemFeedbackCatalogo(`Erro ao buscar produtos: ${error.message}`, 'erro', 0);
    return [];
  }
  return data;
}

// Renderiza os cards dos produtos no catálogo
function renderizarProdutosCatalogo(produtos) {
  divListaCatalogoProdutos.innerHTML = ''; // Limpa a lista atual

  if (!produtos || produtos.length === 0) {
    pNenhumProduto.classList.remove('hidden');
    exibirMensagemFeedbackCatalogo('Nenhum produto encontrado com os critérios atuais.', 'aviso', 4000);
    return;
  }
  
  pNenhumProduto.classList.add('hidden');
  exibirMensagemFeedbackCatalogo(`${produtos.length} produto(s) encontrado(s).`, 'sucesso', 2000);

  produtos.forEach(produto => {
    const card = document.createElement('div');
    card.className = 'product-card bg-white rounded-lg shadow-md overflow-hidden flex flex-col';
    // A descrição pode ser longa, então limitamos a altura do card ou da descrição
    card.innerHTML = `
      <div class="aspect-square overflow-hidden">
        <img src="${produto.imagem_url || 'https://placehold.co/400x400?text=Arte+com+Carinho'}" alt="Imagem de ${produto.nome}" class="w-full h-full object-cover">
      </div>
      <div class="p-4 flex flex-col flex-grow">
        <h3 class="text-lg font-semibold text-pink-700 mb-1 truncate" title="${produto.nome}">${produto.nome}</h3>
        ${produto.categoria ? `<span class="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full self-start mb-2">${produto.categoria}</span>` : ''}
        <p class="text-sm text-gray-600 mb-3 flex-grow">${(produto.descricao || 'Sem descrição disponível.').substring(0, 100)}${ (produto.descricao && produto.descricao.length > 100) ? '...' : ''}</p>
        <button onclick="mostrarInteresse('${produto.nome}')" class="mt-auto bg-pink-500 text-white text-sm px-4 py-2 rounded-md hover:bg-pink-600 transition-colors">Tenho Interesse!</button>
      </div>
    `;
    divListaCatalogoProdutos.appendChild(card);
  });
}

// Função para lidar com a busca/filtragem
async function aplicarBuscaEFiltros() {
  const termoBusca = inputBuscaProduto.value.trim();
  const categoriaFiltro = selectFiltroCategoria.value;
  const produtosFiltrados = await fetchProdutosCatalogo(termoBusca, categoriaFiltro);
  renderizarProdutosCatalogo(produtosFiltrados);
}

// Função placeholder para "Tenho Interesse"
window.mostrarInteresse = function(nomeProduto) {
    // Aqui você pode, por exemplo, abrir um link do WhatsApp, um formulário de contato, ou apenas mostrar uma mensagem.
    // Exemplo com alert, substitua pelo que fizer mais sentido:
    alert(`Ótimo! Você demonstrou interesse no produto: ${nomeProduto}.\nEntre em contato para mais informações! (Seu WhatsApp/Email aqui)`);
    // Ou redirecionar para uma página de contato:
    // window.location.href = `contato.html?produto=${encodeURIComponent(nomeProduto)}`;
}


// Inicialização da Página do Catálogo
async function initCatalogoPage() {
  // Verifica sessão (opcional para catálogo público, mas pode ser útil se houver áreas logadas no futuro)
  // const { data: { session } } = await supabase.auth.getSession();
  // if (!session) { /* ... */ }

  const currentYearEl = document.getElementById('currentYearCatalogo');
  if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
  }

  await carregarOpcoesFiltroCategoria();
  await aplicarBuscaEFiltros(); // Carga inicial dos produtos

  btnAplicarFiltros.addEventListener('click', aplicarBuscaEFiltros);
  // Opcional: aplicar busca ao digitar (com debounce)
  // inputBuscaProduto.addEventListener('input', aplicarBuscaEFiltros); 
  // selectFiltroCategoria.addEventListener('change', aplicarBuscaEFiltros);
}

// Garante que o DOM está carregado
document.addEventListener('DOMContentLoaded', initCatalogoPage);