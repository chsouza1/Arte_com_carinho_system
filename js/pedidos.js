// js/pedidos.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://zjjvzouaalphxenypomp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqanZ6b3VhYWxwaHhlbnlwb21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1NDU0MzMsImV4cCI6MjA2MTEyMTQzM30.V846ghEfXW7D1DegBovnzW7i8T27gdzmygWXOiS7SxQ'; // Sua Anon Key
const supabase = createClient(supabaseUrl, supabaseKey);

const TABELA_PEDIDOS = 'pedidos'; 


const formRegistrarPedido = document.getElementById('form-registrar-pedido');
const inputClienteNomePedido = document.getElementById('clienteNomePedido');
const inputClienteContatoPedido = document.getElementById('clienteContatoPedido');
const textareaDescricaoPedido = document.getElementById('descricaoPedido');
const inputDataEntregaPedido = document.getElementById('dataEntregaPedido');
const inputPrecoCombinadoPedido = document.getElementById('precoCombinadoPedido');
const selectStatusPedidoForm = document.getElementById('statusPedido'); 
const textareaObservacoesPedido = document.getElementById('observacoesPedido');

const btnRegistrarPedido = document.getElementById('btnRegistrarPedido');
const btnPedidoText = document.getElementById('btnPedidoText');
const btnPedidoSpinner = document.getElementById('btnPedidoSpinner');
const btnLimparFormPedido = document.getElementById('btnLimparFormPedido'); 

const divHistoricoPedidos = document.getElementById('lista-historico-pedidos');
const h2FormularioPedido = document.querySelector('#registrar-pedido-section h2'); 


const statusPedidoOptions = [
    'Solicitado', 'Orçamento Enviado', 'Aguardando Pagamento', 'Pagamento Confirmado', 
    'Em Produção', 'Pronto para Entrega/Retirada', 'Enviado', 'Entregue', 'Cancelado'
];

// Variável global para rastrear o pedido em edição
let pedidoSendoEditado = null; 

/* --- Helpers de UI (exibirMensagemFeedbackPedido já existe) --- */
function exibirMensagemFeedbackPedido(msg, tipo = 'sucesso', ms = 5000) {

  const box = document.getElementById('feedback-pedido');
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


function resetarFormularioPedido() {
    formRegistrarPedido.reset();
   
    const dataEntregaDefault = new Date();
    dataEntregaDefault.setDate(dataEntregaDefault.getDate() + 7);
    inputDataEntregaPedido.valueAsDate = dataEntregaDefault;
    selectStatusPedidoForm.value = 'Solicitado'; 

    pedidoSendoEditado = null; 

    if (h2FormularioPedido) h2FormularioPedido.textContent = 'Registrar Novo Pedido';
    btnPedidoText.textContent = 'Registrar Pedido';
    btnRegistrarPedido.removeAttribute('data-modo-edicao');

  
    const btnCancelarEdicao = document.getElementById('btnCancelarEdicaoPedido');
    if (btnCancelarEdicao) {
        btnCancelarEdicao.remove();
    }
     exibirMensagemFeedbackPedido('Formulário pronto para novo pedido.', 'sucesso', 3000); // Opcional
}


/* --- Lógica da Página de Pedidos --------------------------------------- */

function iniciarEdicaoPedido(pedido) {
    pedidoSendoEditado = { ...pedido }; 

    if (h2FormularioPedido) h2FormularioPedido.textContent = `Editando Pedido #${pedido.id.substring(0, 8)}...`;
    
    inputClienteNomePedido.value = pedido.cliente_nome || '';
    inputClienteContatoPedido.value = pedido.cliente_contato || '';
    textareaDescricaoPedido.value = pedido.descricao_pedido || '';
    inputDataEntregaPedido.value = pedido.data_entrega ? pedido.data_entrega.split('T')[0] : '';
    inputPrecoCombinadoPedido.value = pedido.preco_combinado !== null ? parseFloat(pedido.preco_combinado).toFixed(2) : '';
    selectStatusPedidoForm.value = pedido.status_pedido || 'Solicitado';
    textareaObservacoesPedido.value = pedido.observacoes || '';

    btnPedidoText.textContent = 'Salvar Alterações';
    btnRegistrarPedido.setAttribute('data-modo-edicao', 'true');

    
    let btnCancelar = document.getElementById('btnCancelarEdicaoPedido');
    if (!btnCancelar) {
        btnCancelar = document.createElement('button');
        btnCancelar.id = 'btnCancelarEdicaoPedido';
        btnCancelar.type = 'button'; 
        btnCancelar.textContent = 'Cancelar Edição';
        
        btnCancelar.className = 'w-full mt-2 bg-gray-500 text-white px-6 py-2.5 rounded-lg hover:bg-gray-600 transition-colors text-sm';
        btnLimparFormPedido.insertAdjacentElement('afterend', btnCancelar); 
    }
    btnCancelar.classList.remove('hidden');
    btnCancelar.onclick = () => resetarFormularioPedido();


    window.scrollTo({ top: formRegistrarPedido.closest('section').offsetTop - 20, behavior: 'smooth' });
    inputClienteNomePedido.focus();
    exibirMensagemFeedbackPedido(`Editando pedido de: ${pedido.cliente_nome}. Altere os campos e salve.`, 'aviso', 0);
}



async function handlePedidoFormSubmit() {
  const clienteNome = inputClienteNomePedido.value.trim();
  const clienteContato = inputClienteContatoPedido.value.trim();
  const descricaoPedido = textareaDescricaoPedido.value.trim();
  const dataEntrega = inputDataEntregaPedido.value;
  const precoCombinadoInput = inputPrecoCombinadoPedido.value;
  const statusPedido = selectStatusPedidoForm.value;
  const observacoes = textareaObservacoesPedido.value.trim();

  if (!clienteNome || !descricaoPedido || !dataEntrega) {
    exibirMensagemFeedbackPedido('Nome do cliente, descrição e data de entrega são obrigatórios.', 'aviso');
    return;
  }
 
  let precoFinal = null;
  if (precoCombinadoInput.trim() !== '') {
      precoFinal = parseFloat(precoCombinadoInput);
      if (isNaN(precoFinal) || precoFinal < 0) {
          exibirMensagemFeedbackPedido('Preço combinado, se informado, deve ser um número válido e não negativo.', 'aviso');
          return;
      }
  }


  btnPedidoText.textContent = pedidoSendoEditado ? 'Salvando...' : 'Registrando...';
  btnPedidoSpinner.classList.remove('hidden');
  btnRegistrarPedido.disabled = true;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado.');

    const dadosPedido = {
    
      cliente_nome: clienteNome,
      cliente_contato: clienteContato || null,
      descricao_pedido: descricaoPedido,
      data_entrega: dataEntrega,
      preco_combinado: precoFinal,
      status_pedido: statusPedido,
      observacoes: observacoes || null,
    };

    if (pedidoSendoEditado) { // MODO EDIÇÃO
      const { error: updateError } = await supabase
        .from(TABELA_PEDIDOS)
        .update(dadosPedido)
        .eq('id', pedidoSendoEditado.id);
      if (updateError) throw updateError;
      exibirMensagemFeedbackPedido('Pedido atualizado com sucesso!', 'sucesso');
    } else { // MODO CADASTRO NOVO
      dadosPedido.user_id = user.id; 
      dadosPedido.data_solicitacao = new Date().toISOString().split('T')[0]; 
      const { error: insertError } = await supabase.from(TABELA_PEDIDOS).insert([dadosPedido]);
      if (insertError) throw insertError;
      exibirMensagemFeedbackPedido('Novo pedido registrado com sucesso!', 'sucesso');
    }

    resetarFormularioPedido();
    await carregarPedidos();

  } catch (error) {
    console.error('Erro ao salvar pedido:', error);
    exibirMensagemFeedbackPedido(`Erro ao salvar pedido: ${error.message}`, 'erro', 0);
  } finally {
    btnPedidoText.textContent = pedidoSendoEditado ? 'Salvar Alterações' : 'Registrar Pedido';
    btnPedidoSpinner.classList.add('hidden');
    btnRegistrarPedido.disabled = false;
  }
}

async function carregarPedidos() {
  exibirMensagemFeedbackPedido('Carregando pedidos...', 'aviso', 1500);
  const { data: pedidos, error } = await supabase
    .from(TABELA_PEDIDOS)
    .select('*')
    .order('data_entrega', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao carregar pedidos:', error);
    exibirMensagemFeedbackPedido('Falha ao carregar pedidos.', 'erro', 0);
    divHistoricoPedidos.innerHTML = '<p class="text-center text-red-500">Erro ao carregar os pedidos.</p>';
    return;
  }
  renderizarPedidos(pedidos); 
}


function renderizarPedidos(pedidos) {
  divHistoricoPedidos.innerHTML = ''; 

  if (!pedidos || pedidos.length === 0) {
    divHistoricoPedidos.innerHTML = '<p class="text-center text-gray-500 py-10">Nenhum pedido registrado ainda.</p>';
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'space-y-4';
  const opcoesData = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' };

  pedidos.forEach(pedido => {
    const li = document.createElement('li');
    li.className = `bg-white p-4 rounded-lg shadow-md border-l-4 ${getStatusBorderColor(pedido.status_pedido)} hover:shadow-lg transition-shadow`;
    
    const dataEntregaObj = new Date(pedido.data_entrega + 'T00:00:00');
    const dataEntregaFormatada = !isNaN(dataEntregaObj.getTime()) ? dataEntregaObj.toLocaleDateString('pt-BR', opcoesData) : 'Data inválida';
    const dataSolicitacaoObj = new Date(pedido.data_solicitacao + 'T00:00:00');
    const dataSolicitacaoFormatada = !isNaN(dataSolicitacaoObj.getTime()) ? dataSolicitacaoObj.toLocaleDateString('pt-BR', opcoesData) : 'Data inválida';
    let statusColorClass = getStatusTextColor(pedido.status_pedido);

    li.innerHTML = `
      <div class="flex flex-col sm:flex-row justify-between sm:items-start mb-2">
        <div>
          <h4 class="text-lg font-semibold text-pink-700">${pedido.cliente_nome}</h4>
          <p class="text-sm text-gray-600 truncate" title="${pedido.descricao_pedido}">Pedido: ${pedido.descricao_pedido.substring(0,50)}${pedido.descricao_pedido.length > 50 ? '...' : ''}</p>
        </div>
        <div class="text-sm text-gray-500 mt-2 sm:mt-0 sm:text-right">
            <p>Solicitado em: ${dataSolicitacaoFormatada}</p>
            <p class="font-medium">Entrega: ${dataEntregaFormatada}</p>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
        <p><span class="font-medium text-gray-600">Contato:</span> ${pedido.cliente_contato || 'N/A'}</p>
        <p><span class="font-medium text-gray-600">Preço:</span> ${pedido.preco_combinado ? Number(pedido.preco_combinado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'A combinar'}</p>
      </div>
      <div class="my-2 flex items-center gap-2">
        <label for="status-select-${pedido.id}" class="text-xs font-medium text-gray-600">Status:</label>
        <select id="status-select-${pedido.id}" data-pedido-id="${pedido.id}" class="status-select ${statusColorClass} w-auto flex-grow">
          ${statusPedidoOptions.map(status => `<option value="${status}" ${pedido.status_pedido === status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
      </div>
      ${pedido.observacoes ? `<p class="text-xs bg-gray-50 p-2 rounded text-gray-600 mt-1"><span class="font-medium">Obs:</span> ${pedido.observacoes}</p>` : ''}
      <div class="mt-3 pt-3 border-t border-pink-100 flex justify-end space-x-2">
        <button data-action="editar-pedido" class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md transition-colors">Editar Pedido</button>
        <button data-action="cancelar-pedido" data-id="${pedido.id}" class="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md transition-colors">Cancelar Pedido</button>
      </div>
    `;

    li.querySelector(`select[data-pedido-id="${pedido.id}"]`).addEventListener('change', (e) => handleMudarStatusPedido(pedido.id, e.target.value, e.target));
    li.querySelector('button[data-action="cancelar-pedido"]').addEventListener('click', () => handleCancelarPedido(pedido.id, pedido.cliente_nome));
    li.querySelector('button[data-action="editar-pedido"]').addEventListener('click', () => iniciarEdicaoPedido(pedido));


    ul.appendChild(li);
  });
  divHistoricoPedidos.appendChild(ul);
}

function getStatusBorderColor(status) { 
    switch (status) {
        case 'Entregue': return 'border-green-500';
        case 'Cancelado': return 'border-gray-400';
        case 'Em Produção': return 'border-blue-500';
        case 'Pronto para Entrega/Retirada': return 'border-yellow-500';
        case 'Aguardando Pagamento': return 'border-orange-500';
        default: return 'border-pink-300';
    }
}
function getStatusTextColor(status) { 
    switch (status) {
        case 'Entregue': return 'text-green-700 font-semibold';
        case 'Cancelado': return 'text-gray-500 line-through';
        case 'Em Produção': return 'text-blue-700 font-semibold';
        case 'Pronto para Entrega/Retirada': return 'text-yellow-700 font-semibold';
        case 'Aguardando Pagamento': return 'text-orange-700 font-semibold';
        default: return 'text-pink-700';
    }
}

async function handleMudarStatusPedido(pedidoId, novoStatus, selectElement) {
  exibirMensagemFeedbackPedido(`Atualizando status para "${novoStatus}"...`, 'aviso', 0);
  selectElement.disabled = true;

  try {
    const { error } = await supabase
      .from(TABELA_PEDIDOS)
      .update({ status_pedido: novoStatus })
      .eq('id', pedidoId);

    if (error) throw error;

    exibirMensagemFeedbackPedido('Status do pedido atualizado com sucesso!', 'sucesso');
    const listItem = selectElement.closest('li');
    if (listItem) {
        listItem.className = `bg-white p-4 rounded-lg shadow-md border-l-4 ${getStatusBorderColor(novoStatus)} hover:shadow-lg transition-shadow`;
    }
    selectElement.className = `status-select ${getStatusTextColor(novoStatus)} w-auto flex-grow`;

  } catch (error) {
    console.error('Erro ao mudar status do pedido:', error);
    exibirMensagemFeedbackPedido(`Erro ao mudar status: ${error.message}`, 'erro', 0);
    const { data: pedidoOriginal } = await supabase.from(TABELA_PEDIDOS).select('status_pedido').eq('id', pedidoId).single();
    if(pedidoOriginal) selectElement.value = pedidoOriginal.status_pedido;

  } finally {
    selectElement.disabled = false;
  }
}
async function handleCancelarPedido(pedidoId, clienteNome) { 
  if (!confirm(`Tem certeza que deseja cancelar o pedido de "${clienteNome}" (ID: ${pedidoId.substring(0,8)})?\nEsta ação definirá o status como "Cancelado".`)) {
    return;
  }
  exibirMensagemFeedbackPedido(`Cancelando pedido de "${clienteNome}"...`, 'aviso', 0);
  
  try {
    const { error } = await supabase
      .from(TABELA_PEDIDOS)
      .update({ status_pedido: 'Cancelado' })
      .eq('id', pedidoId);

    if (error) throw error;

    exibirMensagemFeedbackPedido(`Pedido de "${clienteNome}" cancelado com sucesso.`, 'sucesso');
    await carregarPedidos(); 
  
  } catch (error) {
    console.error('Erro ao cancelar pedido:', error);
    exibirMensagemFeedbackPedido(`Erro ao cancelar pedido: ${error.message}`, 'erro', 0);
  }
}


async function initPedidosPage() {

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }
  const currentYearEl = document.getElementById('currentYear');
  if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
  }
  
  const dataEntregaDefault = new Date();
  dataEntregaDefault.setDate(dataEntregaDefault.getDate() + 7);
  inputDataEntregaPedido.valueAsDate = dataEntregaDefault;
  
  selectStatusPedidoForm.value = 'Solicitado';

  await carregarPedidos();

  btnRegistrarPedido.addEventListener('click', handlePedidoFormSubmit); 
  btnLimparFormPedido.addEventListener('click', resetarFormularioPedido); 
}

document.addEventListener('DOMContentLoaded', initPedidosPage);