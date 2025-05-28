// js/catalogo_publico.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Use as mesmas credenciais, a chave ANON é segura para o frontend público
const supabaseUrl = 'https://zjjvzouaalphxenypomp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqanZ6b3VhYWxwaHhlbnlwb21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1NDU0MzMsImV4cCI6MjA2MTEyMTQzM30.V846ghEfXW7D1DegBovnzW7i8T27gdzmygWXOiS7SxQ';
const supabase = createClient(supabaseUrl, supabaseKey);

const TABELA_CATALOGO_ITENS = 'catalogo_itens';
const ITEMS_PER_PAGE = 12; // Quantos itens por página para paginação

// Elementos do DOM
const inputBusca = document.getElementById('buscaCatalogo');
const selectCategoria = document.getElementById('filtroCategoriaCatalogo');
const btnAplicarFiltros = document.getElementById('btnAplicarFiltrosCatalogo');
const divListaProdutos = document.getElementById('lista-publica-produtos');
const pNenhumProdutoMsg = document.getElementById('nenhum-produto-catalogo');
const feedbackDivPublic = document.getElementById('feedback-catalogo-publico');

// Paginação
const navPaginacao = document.getElementById('paginacao-catalogo');
const btnAnterior = document.getElementById('btnAnterior');
const btnProxima = document.getElementById('btnProxima');
const spanInfoPagina = document.getElementById('infoPagina');

let currentPage = 1;
let totalItems = 0;

/* --- Helpers de UI ---------------------------------------------------- */
function exibirFeedback(msg, tipo = 'sucesso', ms = 3000) {
  if (!feedbackDivPublic) return;
  feedbackDivPublic.textContent = msg;
  feedbackDivPublic.className = 'mb-6 p-3 rounded-lg text-sm'; // Limpa classes
  const cores = {
    sucesso: ['bg-green-100', 'text-green-700'],
    erro:   ['bg-red-100',   'text-red-700'],
    aviso:  ['bg-yellow-100','text-yellow-700']
  };
  feedbackDivPublic.classList.add(...cores[tipo]);
  feedbackDivPublic.classList.remove('hidden');
  if (ms > 0) {
    setTimeout(() => feedbackDivPublic.classList.add('hidden'), ms);
  }
}

/* --- Lógica do Catálogo Público --------------------------------------- */

async function carregarOpcoesFiltroCategorias() {
  const { data, error } = await supabase
    .from(TABELA_CATALOGO_ITENS)
    .select('categoria', { distinct: true }) // Supabase não tem distinct direto assim, precisamos processar
    .eq('disponivel_no_catalogo', true);

  if (error) {
    console.error('Erro ao carregar categorias para filtro:', error);
    return;
  }

  if (data) {
    const categoriasUnicas = [...new Set(data.map(item => item.categoria).filter(Boolean))].sort();
    selectCategoria.innerHTML = '<option value="">Todas as Categorias</option>'; // Reset
    categoriasUnicas.forEach(categoria => {
      const option = document.createElement('option');
      option.value = categoria;
      option.textContent = categoria;
      selectCategoria.appendChild(option);
    });
  }
}

async function fetchPublicCatalogItems(page = 1) {
  exibirFeedback('Carregando criações...', 'aviso', 2000);
  
  const termoBusca = inputBusca.value.trim();
  const categoriaFiltro = selectCategoria.value;

  let query = supabase
    .from(TABELA_CATALOGO_ITENS)
    .select('id, nome, descricao, imagem_url, categoria, tags', { count: 'exact' }) // Pega a contagem total
    .eq('disponivel_no_catalogo', true); // RLS já deve fazer isso, mas é uma segurança extra

  if (termoBusca) {
    // Busca em nome E descrição E tags (se tags for um array de texto, use contains)
    // Para busca em múltiplas colunas, o ideal seria usar Full-Text Search do Postgres ou RPC
    // Simplificação: busca no nome OU na descrição. Para tags, seria .cs('tags', [termoBusca])
    query = query.or(`nome.ilike.%${termoBusca}%,descricao.ilike.%${termoBusca}%`);
  }
  if (categoriaFiltro) {
    query = query.eq('categoria', categoriaFiltro);
  }

  // Paginação
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;
  query = query.range(from, to);

  query = query.order('created_at', { ascending: false }); // Mais recentes primeiro

  const { data, error, count } = await query;

  if (error) {
    console.error('Erro ao buscar itens do catálogo:', error);
    exibirFeedback(`Erro ao buscar itens: ${error.message}`, 'erro', 0);
    return { items: [], totalCount: 0 };
  }
  
  totalItems = count; // Armazena a contagem total de itens que correspondem aos filtros
  return { items: data, totalCount: count };
}

function renderPublicCatalogItems(items) {
  divListaProdutos.innerHTML = '';

  if (!items || items.length === 0) {
    pNenhumProdutoMsg.classList.remove('hidden');
    // exibirFeedback('Nenhum item encontrado com os critérios atuais.', 'aviso', 4000); // Já tratado pelo pNenhumProdutoMsg
    return;
  }
  
  pNenhumProdutoMsg.classList.add('hidden');
  // exibirFeedback(`${items.length} item(s) nesta página.`, 'sucesso', 2000);

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'product-card bg-white rounded-xl shadow-lg overflow-hidden flex flex-col';
    
    // Limita a descrição
    const descCurta = (item.descricao || 'Uma bela criação artesanal.').substring(0, 80);

    card.innerHTML = `
      <div class="aspect-[4/3] w-full overflow-hidden">
        <img src="${item.imagem_url || 'https://placehold.co/600x450/fce7f3/db2777?text=Arte+Com+Carinho'}" alt="Foto de ${item.nome}" class="w-full h-full object-cover transition-transform duration-300 hover:scale-110">
      </div>
      <div class="p-5 flex flex-col flex-grow">
        ${item.categoria ? `<span class="text-xs text-pink-600 font-semibold mb-1 uppercase tracking-wider">${item.categoria}</span>` : ''}
        <h3 class="text-xl font-display font-bold text-gray-800 mb-2 truncate" title="${item.nome}">${item.nome}</h3>
        <p class="text-sm text-gray-600 mb-3 flex-grow">${descCurta}${item.descricao && item.descricao.length > 80 ? '...' : ''}</p>
        ${item.tags && item.tags.length > 0 ? `
            <div class="mb-3 flex flex-wrap gap-1.5">
                ${item.tags.map(tag => `<span class="tag-item">${tag}</span>`).join('')}
            </div>
        ` : ''}
        <button onclick="handleInteresse('${item.id}', '${item.nome.replace(/'/g, "\\'")}')" class="btn-interesse mt-auto w-full text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm">
          Tenho Interesse
        </button>
      </div>
    `;
    divListaProdutos.appendChild(card);
  });
}

function updatePaginationControls() {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (spanInfoPagina) spanInfoPagina.textContent = `Página ${currentPage} de ${totalPages}`;

    if (btnAnterior) btnAnterior.disabled = currentPage === 1;
    if (btnProxima) btnProxima.disabled = currentPage === totalPages || totalPages === 0;

    if (navPaginacao) {
        if (totalPages > 1) {
            navPaginacao.classList.remove('hidden');
        } else {
            navPaginacao.classList.add('hidden');
        }
    }
}


async function carregarEExibirItens(page = 1) {
    currentPage = page;
    const { items, totalCount } = await fetchPublicCatalogItems(currentPage);
    renderPublicCatalogItems(items);
    updatePaginationControls();
}

// Função global para o botão "Tenho Interesse"
window.handleInteresse = function(itemId, itemName) {
  console.log(`Interesse no item ID: ${itemId}, Nome: ${itemName}`);
  // Implementar o que acontece: abrir modal de contato, link do WhatsApp, etc.
  exibirFeedback(`Que bom que se interessou por "${itemName}"! Entre em contato para mais detalhes.`, 'sucesso', 5000);
  // Exemplo: Redirecionar para uma página de contato com o nome do produto
  // window.location.href = `contato.html?produto=${encodeURIComponent(itemName)}`;
}

// Inicialização
async function initPublicCatalogo() {
  const currentYearEl = document.getElementById('currentYearPublicCatalogo');
  if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
  }

  // Menu mobile
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  await carregarOpcoesFiltroCategorias();
  await carregarEExibirItens(1); // Carga inicial com paginação

  btnAplicarFiltros.addEventListener('click', () => carregarEExibirItens(1)); // Reseta para página 1 ao filtrar/buscar
  // Opcional: aplicar busca ao digitar (com debounce)
  // let debounceTimer;
  // inputBusca.addEventListener('input', () => {
  //   clearTimeout(debounceTimer);
  //   debounceTimer = setTimeout(() => carregarEExibirItens(1), 500);
  // });
  
  if(btnAnterior) btnAnterior.addEventListener('click', () => {
    if (currentPage > 1) {
        carregarEExibirItens(currentPage - 1);
    }
  });
  if(btnProxima) btnProxima.addEventListener('click', () => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (currentPage < totalPages) {
        carregarEExibirItens(currentPage + 1);
    }
  });
}

document.addEventListener('DOMContentLoaded', initPublicCatalogo);