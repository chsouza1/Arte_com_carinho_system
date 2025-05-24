// js/vendas.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://zjjvzouaalphxenypomp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqanZ6b3VhYWxwaHhlbnlwb21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1NDU0MzMsImV4cCI6MjA2MTEyMTQzM30.V846ghEfXW7D1DegBovnzW7i8T27gdzmygWXOiS7SxQ';
const supabase = createClient(supabaseUrl, supabaseKey);

const TABELA_PRODUTOS = 'produtos';
const TABELA_VENDAS = 'vendas';

// Elementos do DOM (alguns já definidos, outros podem ser necessários)
const formRegistrarVenda = document.getElementById('form-registrar-venda');
const selectProdutoVendido = document.getElementById('produtoVendido');
const inputDataVenda = document.getElementById('dataVenda');
const inputQuantidadeVendida = document.getElementById('quantidadeVendida');
const inputPrecoVendaUnitario = document.getElementById('precoVendaUnitario');
const spanTotalVendaCalculado = document.getElementById('totalVendaCalculado');
const inputClienteNome = document.getElementById('clienteNome');
const selectMetodoPagamento = document.getElementById('metodoPagamento');
const textareaObservacoes = document.getElementById('observacoesVenda');
const btnRegistrarVenda = document.getElementById('btnRegistrarVenda');
const btnVendaText = document.getElementById('btnVendaText');
const btnVendaSpinner = document.getElementById('btnVendaSpinner');
const divHistoricoVendas = document.getElementById('lista-historico-vendas');
const pEstoqueDisponivel = document.getElementById('estoqueDisponivel');
const h2FormularioVenda = document.querySelector('#registrar-venda-section h2');


let todosOsProdutos = [];
let vendaSendoEditada = null; // Guarda o objeto da venda original que está sendo editada

/* --- Helpers de UI ---------------------------------------------------- */
function exibirMensagemFeedbackVenda(msg, tipo = 'sucesso', ms = 5000) {
  const box = document.getElementById('feedback-venda');
  if (!box) return;
  box.textContent = msg;
  box.className = 'mb-6 p-3 rounded-lg text-sm transition-all duration-300'; 
  const cores = {
    sucesso: ['bg-green-100', 'text-green-700'],
    erro:   ['bg-red-100',   'text-red-700'],
    aviso:  ['bg-yellow-100','text-yellow-700']
  };
  box.classList.add(...cores[tipo]);
  if (ms > 0) {
    box.classList.remove('hidden');
    setTimeout(() => box.classList.add('hidden'), ms);
  } else {
    box.classList.remove('hidden');
  }
}

/* --- Lógica da Página de Vendas --------------------------------------- */
async function carregarProdutosParaSelect(produtoIdSelecionado = null) {
  const { data, error } = await supabase
    .from(TABELA_PRODUTOS)
    .select('id, nome, preco, quantidade')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao carregar produtos para o select:', error);
    exibirMensagemFeedbackVenda('Falha ao carregar produtos. Tente recarregar.', 'erro', 0);
    return;
  }
  
  todosOsProdutos = data; 
  const valorAnteriorSelect = produtoIdSelecionado || selectProdutoVendido.value; // Mantém o valor se já estiver selecionado
  selectProdutoVendido.innerHTML = '<option value="">Selecione um produto...</option>'; 
  
  data.forEach(produto => {
    // Mesmo se o estoque for 0, lista para o caso de estar editando uma venda de um produto que acabou
    const option = document.createElement('option');
    option.value = produto.id;
    option.textContent = `${produto.nome} (Estoque: ${produto.quantidade})`;
    option.dataset.estoqueAtual = produto.quantidade; // Guarda o estoque atual
    option.dataset.precoAtual = produto.preco;     // Guarda o preço atual
    selectProdutoVendido.appendChild(option);
  });
  // Restaura a seleção se aplicável (importante ao recarregar após edição/deleção)
  if (valorAnteriorSelect) {
    selectProdutoVendido.value = valorAnteriorSelect;
  }
   // Se estiver editando, o select pode estar desabilitado. handleProdutoSelecionado irá lidar com isso
  if (!vendaSendoEditada) { // Só chama se não estiver no meio de uma edição (para não sobrescrever dados do form)
    handleProdutoSelecionado();
  }
}

function handleProdutoSelecionado() {
  const produtoId = selectProdutoVendido.value;
  pEstoqueDisponivel.textContent = '';

  if (!vendaSendoEditada) { // Se não estiver editando, limpa e preenche com base no select
    inputPrecoVendaUnitario.value = '';
    inputQuantidadeVendida.value = '1';
    inputQuantidadeVendida.max = '';
  }
  
  if (produtoId) {
    const optionSelecionada = selectProdutoVendido.options[selectProdutoVendido.selectedIndex];
    const estoqueAtual = parseInt(optionSelecionada.dataset.estoqueAtual);
    const precoAtual = parseFloat(optionSelecionada.dataset.precoAtual);

    if (!vendaSendoEditada) { // Preenche preço e max da quantidade apenas se for nova venda
        inputPrecoVendaUnitario.value = precoAtual.toFixed(2);
        inputQuantidadeVendida.max = estoqueAtual;
    }
    pEstoqueDisponivel.textContent = `Disponível: ${estoqueAtual} unidades.`;
  }
  calcularTotalVenda();
}

function calcularTotalVenda() {
    const quantidade = parseFloat(inputQuantidadeVendida.value) || 0;
    const precoUnitario = parseFloat(inputPrecoVendaUnitario.value) || 0;
    const total = quantidade * precoUnitario;
    spanTotalVendaCalculado.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function handleFormVendaSubmit() {
  const produtoId = selectProdutoVendido.value; // Se estiver editando, este select estará desabilitado mas com valor.
  const dataVenda = inputDataVenda.value;
  const quantidadeVendida = parseInt(inputQuantidadeVendida.value);
  const precoVendaUnitario = parseFloat(inputPrecoVendaUnitario.value);
  const clienteNome = inputClienteNome.value.trim();
  const metodoPagamento = selectMetodoPagamento.value;
  const observacoes = textareaObservacoes.value.trim();

  if (!produtoId || !dataVenda || isNaN(quantidadeVendida) || isNaN(precoVendaUnitario)) {
    exibirMensagemFeedbackVenda('Produto, data, quantidade e preço unitário são obrigatórios.', 'aviso');
    return;
  }
  // Outras validações... (quantidade > 0, preco >= 0)

  btnVendaText.textContent = vendaSendoEditada ? 'Salvando...' : 'Registrando...';
  btnVendaSpinner.classList.remove('hidden');
  btnRegistrarVenda.disabled = true;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const precoVendaTotal = quantidadeVendida * precoVendaUnitario;
    const dadosVenda = {
      user_id: user.id,
      produto_id: vendaSendoEditada ? vendaSendoEditada.produto_id : produtoId, // Mantém o produto original na edição
      quantidade_vendida: quantidadeVendida,
      preco_venda_unitario: precoVendaUnitario,
      preco_venda_total: precoVendaTotal,
      data_venda: dataVenda,
      cliente_nome: clienteNome || null,
      metodo_pagamento: metodoPagamento || null,
      observacoes: observacoes || null
    };

    if (vendaSendoEditada) { // MODO EDIÇÃO
      // 1. Calcular a diferença de estoque
      const produtoEstoqueOriginal = todosOsProdutos.find(p => p.id === vendaSendoEditada.produto_id);
      if(!produtoEstoqueOriginal) throw new Error ("Produto original da venda não encontrado para ajuste de estoque.");
      
      // Diferença em relação à quantidade original da VENDA (vendaSendoEditada.quantidade_vendida)
      const diferencaQuantidade = vendaSendoEditada.quantidade_vendida - quantidadeVendida;
      // Se diferencaQuantidade > 0, significa que a nova quantidade vendida é MENOR (devolve ao estoque)
      // Se diferencaQuantidade < 0, significa que a nova quantidade vendida é MAIOR (retira mais do estoque)
      const novoEstoqueProduto = produtoEstoqueOriginal.quantidade + diferencaQuantidade;

      if (novoEstoqueProduto < 0) {
          throw new Error(`Estoque insuficiente para alterar a quantidade da venda. Novo estoque seria: ${novoEstoqueProduto}`);
      }

      // 2. Atualizar a venda
      const { error: vendaUpdateError } = await supabase
        .from(TABELA_VENDAS)
        .update(dadosVenda)
        .eq('id', vendaSendoEditada.id);
      if (vendaUpdateError) throw vendaUpdateError;

      // 3. Atualizar o estoque do produto
      const { error: estoqueUpdateError } = await supabase
        .from(TABELA_PRODUTOS)
        .update({ quantidade: novoEstoqueProduto })
        .eq('id', vendaSendoEditada.produto_id);
      if (estoqueUpdateError) throw estoqueUpdateError;
      
      exibirMensagemFeedbackVenda('Venda atualizada com sucesso!', 'sucesso');

    } else { // MODO CADASTRO NOVO
      const produtoParaNovaVenda = todosOsProdutos.find(p => p.id === produtoId);
      if (!produtoParaNovaVenda || quantidadeVendida > produtoParaNovaVenda.quantidade) {
        exibirMensagemFeedbackVenda(`Estoque insuficiente para o produto ${produtoParaNovaVenda?.nome || 'selecionado'}. Disponível: ${produtoParaNovaVenda?.quantidade || 0}.`, 'aviso');
        throw new Error("Estoque insuficiente"); // Para o finally resetar o botão
      }

      const { error: vendaInsertError } = await supabase.from(TABELA_VENDAS).insert([dadosVenda]);
      if (vendaInsertError) throw vendaInsertError;

      const novoEstoqueProduto = produtoParaNovaVenda.quantidade - quantidadeVendida;
      const { error: estoqueUpdateError } = await supabase
        .from(TABELA_PRODUTOS)
        .update({ quantidade: novoEstoqueProduto })
        .eq('id', produtoId);
      if (estoqueUpdateError) throw estoqueUpdateError;

      exibirMensagemFeedbackVenda('Venda registrada com sucesso!', 'sucesso');
    }

    resetarFormularioVenda();
    await carregarProdutosParaSelect(produtoId); // Recarrega produtos e mantém seleção se possível
    await carregarHistoricoVendas();

  } catch (error) {
    console.error('Erro no formulário de venda:', error);
    exibirMensagemFeedbackVenda(`Erro: ${error.message}`, 'erro', 0);
  } finally {
    btnVendaText.textContent = vendaSendoEditada ? 'Salvar Alterações' : 'Registrar Venda';
     if(vendaSendoEditada) { // Mantém o texto de Salvar se ainda estiver em modo de edição (ex: erro de validação)
        btnVendaText.textContent = 'Salvar Alterações';
    } else {
        btnVendaText.textContent = 'Registrar Venda';
    }
    btnVendaSpinner.classList.add('hidden');
    btnRegistrarVenda.disabled = false;
  }
}

function iniciarEdicaoVenda(venda) {
    vendaSendoEditada = { ...venda }; // Clona o objeto da venda para edição

    h2FormularioVenda.textContent = `Editando Venda #${venda.id.substring(0,8)}...`;
    selectProdutoVendido.value = venda.produto_id;
    selectProdutoVendido.disabled = true; // Não permite mudar o produto ao editar
    
    inputDataVenda.value = venda.data_venda.split('T')[0]; // Formato YYYY-MM-DD para input date
    inputQuantidadeVendida.value = venda.quantidade_vendida;
    inputPrecoVendaUnitario.value = parseFloat(venda.preco_venda_unitario).toFixed(2);
    inputClienteNome.value = venda.cliente_nome || '';
    selectMetodoPagamento.value = venda.metodo_pagamento || '';
    textareaObservacoes.value = venda.observacoes || '';

    handleProdutoSelecionado(); // Para atualizar estoque disponível e total, mesmo com select desabilitado
    
    btnVendaText.textContent = 'Salvar Alterações';
    btnRegistrarVenda.dataset.modo = 'editar';

    let btnCancelar = document.getElementById('btnCancelarEdicaoVenda');
    if (!btnCancelar) {
        btnCancelar = document.createElement('button');
        btnCancelar.id = 'btnCancelarEdicaoVenda';
        btnCancelar.type = 'button';
        btnCancelar.textContent = 'Cancelar Edição';
        btnCancelar.className = 'w-full mt-3 bg-gray-300 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-400 transition-colors text-sm';
        btnCancelar.onclick = () => resetarFormularioVenda();
        formRegistrarVenda.appendChild(btnCancelar); // Adiciona ao final do form
    }
    btnCancelar.classList.remove('hidden');

    window.scrollTo({ top: formRegistrarVenda.offsetTop - 20, behavior: 'smooth' });
    exibirMensagemFeedbackVenda(`Editando venda de "${venda.produtos.nome}". Altere os campos desejados.`, 'aviso', 0);
}

function resetarFormularioVenda() {
    formRegistrarVenda.reset();
    inputDataVenda.valueAsDate = new Date(); // Data atual
    vendaSendoEditada = null;
    selectProdutoVendido.disabled = false;
    h2FormularioVenda.textContent = 'Registrar Nova Venda';
    btnVendaText.textContent = 'Registrar Venda';
    btnRegistrarVenda.removeAttribute('data-modo');
    
    const btnCancelar = document.getElementById('btnCancelarEdicaoVenda');
    if (btnCancelar) {
        btnCancelar.classList.add('hidden');
    }
    pEstoqueDisponivel.textContent = '';
    spanTotalVendaCalculado.textContent = 'R$ 0,00';
    exibirMensagemFeedbackVenda('Formulário de venda limpo.', 'sucesso', 3000);
    carregarProdutosParaSelect(); // Recarrega para garantir que o select está atualizado
}


async function removerVenda(venda) {
  const nomeProdutoVendido = venda.produtos ? venda.produtos.nome : `ID ${venda.produto_id}`;
  if (!confirm(`Tem certeza que deseja remover a venda de "${nomeProdutoVendido}"?\nEsta ação tentará devolver ${venda.quantidade_vendida} unidade(s) ao estoque do produto.`)) {
    return;
  }

  exibirMensagemFeedbackVenda(`Removendo venda de "${nomeProdutoVendido}"...`, 'aviso', 0);

  try {
    // 1. Buscar produto para pegar estoque atual antes de reverter
    const { data: produtoAtual, error: prodError } = await supabase
      .from(TABELA_PRODUTOS)
      .select('quantidade')
      .eq('id', venda.produto_id)
      .single();

    if (prodError) throw new Error(`Não foi possível buscar o produto para reverter o estoque: ${prodError.message}`);
    if (!produtoAtual) throw new Error('Produto associado à venda não encontrado para reverter estoque.');

    // 2. Deletar a venda
    const { error: deleteError } = await supabase
      .from(TABELA_VENDAS)
      .delete()
      .eq('id', venda.id);
    if (deleteError) throw deleteError;

    // 3. Reverter o estoque do produto
    const estoqueRestaurado = produtoAtual.quantidade + venda.quantidade_vendida;
    const { error: updateStockError } = await supabase
      .from(TABELA_PRODUTOS)
      .update({ quantidade: estoqueRestaurado })
      .eq('id', venda.produto_id);
    if (updateStockError) throw new Error(`Venda removida, mas falha ao reverter estoque: ${updateStockError.message}. Verifique manualmente.`);
    
    exibirMensagemFeedbackVenda(`Venda de "${nomeProdutoVendido}" removida e estoque atualizado!`, 'sucesso');
    await carregarProdutosParaSelect(venda.produto_id); // Recarrega produtos, pode manter o produto selecionado para contexto
    await carregarHistoricoVendas();

  } catch (error) {
    console.error('Erro ao remover venda:', error);
    exibirMensagemFeedbackVenda(`Erro ao remover venda: ${error.message}`, 'erro', 0);
  }
}


async function carregarHistoricoVendas() {
  // ... (lógica de carregarHistoricoVendas - atenção para o JOIN com produtos) ...
  const { data: vendas, error } = await supabase
    .from(TABELA_VENDAS)
    .select(`*, produtos (id, nome)`) // Assegure-se que produtos(id, nome) é o suficiente ou pegue mais campos.
    .order('data_venda', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao carregar histórico de vendas:', error);
    exibirMensagemFeedbackVenda('Falha ao carregar histórico.', 'erro', 0);
    divHistoricoVendas.innerHTML = '<p class="text-center text-red-500">Erro ao carregar o histórico.</p>';
    return;
  }
  renderizarHistoricoVendas(vendas);
}

function renderizarHistoricoVendas(vendas) {
  divHistoricoVendas.innerHTML = ''; 

  if (!vendas || vendas.length === 0) {
    divHistoricoVendas.innerHTML = '<p class="text-center text-gray-500 py-10">Nenhuma venda registrada ainda.</p>';
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'space-y-4';

  vendas.forEach(venda => {
    const li = document.createElement('li');
    li.className = 'bg-white p-4 rounded-lg shadow-md border border-pink-200 hover:shadow-lg transition-shadow';
    
    const nomeProduto = (venda.produtos && venda.produtos.nome) ? venda.produtos.nome : 'Produto Desconhecido';
    // Tratamento de data para evitar problemas com fuso se 'data_venda' for apenas 'date'
    const dataObj = new Date(venda.data_venda + 'T00:00:00'); // Assume que a data no banco é local sem fuso
    const dataFormatada = dataObj.toLocaleDateString('pt-BR', {timeZone: 'America/Sao_Paulo'});


    li.innerHTML = `
      <div class="flex flex-col sm:flex-row justify-between sm:items-center mb-2">
        <h4 class="text-lg font-semibold text-pink-600">${nomeProduto}</h4>
        <p class="text-sm text-gray-500">Venda em: ${dataFormatada}</p>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm mb-3">
        <p><span class="font-medium text-gray-600">Qtd:</span> ${venda.quantidade_vendida}</p>
        <p><span class="font-medium text-gray-600">Preço Un.:</span> ${Number(venda.preco_venda_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        <p class="col-span-2 sm:col-span-1"><span class="font-medium text-gray-600">Total:</span> <span class="font-semibold text-green-600">${Number(venda.preco_venda_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
      </div>
      ${venda.cliente_nome ? `<p class="text-xs text-gray-500"><span class="font-medium">Cliente:</span> ${venda.cliente_nome}</p>` : ''}
      ${venda.metodo_pagamento ? `<p class="text-xs text-gray-500"><span class="font-medium">Pagamento:</span> ${venda.metodo_pagamento}</p>` : ''}
      ${venda.observacoes ? `<p class="text-xs text-gray-500 mt-1"><span class="font-medium">Obs:</span> ${venda.observacoes}</p>` : ''}
      <div class="mt-3 pt-3 border-t border-pink-100 flex justify-end space-x-2">
        <button data-action="editar-venda" class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md transition-colors">Editar</button>
        <button data-action="remover-venda" class="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md transition-colors">Remover</button>
      </div>
    `;

    // Adiciona listeners aos botões de cada item da venda
    li.querySelector('button[data-action="editar-venda"]').addEventListener('click', () => iniciarEdicaoVenda(venda));
    li.querySelector('button[data-action="remover-venda"]').addEventListener('click', () => removerVenda(venda)); // Passa o objeto venda inteiro

    ul.appendChild(li);
  });
  divHistoricoVendas.appendChild(ul);
}


// Inicialização da página
async function initVendasPage() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  const currentYearEl = document.getElementById('currentYear');
  if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
  }
  
  inputDataVenda.valueAsDate = new Date();

  await carregarProdutosParaSelect();
  await carregarHistoricoVendas();

  selectProdutoVendido.addEventListener('change', handleProdutoSelecionado);
  inputQuantidadeVendida.addEventListener('input', calcularTotalVenda);
  inputPrecoVendaUnitario.addEventListener('input', calcularTotalVenda);
  btnRegistrarVenda.addEventListener('click', handleFormVendaSubmit);
}

document.addEventListener('DOMContentLoaded', initVendasPage);