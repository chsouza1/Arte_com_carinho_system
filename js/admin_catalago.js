// js/admin_catalogo.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://zjjvzouaalphxenypomp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqanZ6b3VhYWxwaHhlbnlwb21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1NDU0MzMsImV4cCI6MjA2MTEyMTQzM30.V846ghEfXW7D1DegBovnzW7i8T27gdzmygWXOiS7SxQ'; // Sua Chave Anon (o RLS cuidará da segurança)
const supabase = createClient(supabaseUrl, supabaseKey);

const TABELA_CATALOGO_ITENS = 'catalogo_itens';
const BUCKET_CATALOGO_IMAGENS = 'catalogo-imagens';

// Elementos do DOM - Formulário
const formItemCatalogo = document.getElementById('form-item-catalogo');
const inputItemIdCatalogo = document.getElementById('itemIdCatalogo');
const inputNomeItem = document.getElementById('nomeItemCatalogo');
const textareaDescricaoItem = document.getElementById('descricaoItemCatalogo');
const inputCategoriaItem = document.getElementById('categoriaItemCatalogo');
const inputTagsItem = document.getElementById('tagsItemCatalogo');
const inputFileImagemItem = document.getElementById('imagemItemCatalogo');
const imagePreviewContainer = document.getElementById('imagePreviewContainerCatalogo');
const imagePreview = document.getElementById('imagePreviewCatalogo');
const uploadPrompt = document.getElementById('uploadPromptCatalogo');
const checkboxDisponivel = document.getElementById('disponivelItemCatalogo');
const btnSalvarItem = document.getElementById('btnSalvarItemCatalogo');
const btnItemText = document.getElementById('btnItemCatalogoText');
const btnItemSpinner = document.getElementById('btnItemCatalogoSpinner');
const btnLimparForm = document.getElementById('btnLimparFormItemCatalogo');
const feedbackDiv = document.getElementById('feedback-item-catalogo');
const formTitulo = document.getElementById('formItemCatalogoTitulo');

// Elementos do DOM - Lista
const gridItensCatalogo = document.getElementById('grid-itens-catalogo');
const pNenhumItem = document.getElementById('nenhum-item-catalogo');

let currentUser = null;
let itemEmEdicaoUrlImagemAtual = null; // Para guardar a URL da imagem ao editar

/* --- Helpers de UI ---------------------------------------------------- */
function exibirMensagemFeedback(msg, tipo = 'sucesso', ms = 5000) {
  if (!feedbackDiv) {
    console.warn("Elemento de feedback não encontrado no DOM.");
    return;
  }
  feedbackDiv.textContent = msg;
  feedbackDiv.className = 'mb-6 p-3 rounded-lg text-sm transition-all duration-300'; // Limpa classes anteriores
  const cores = {
    sucesso: ['bg-green-100', 'text-green-700'],
    erro:   ['bg-red-100',   'text-red-700'],
    aviso:  ['bg-yellow-100','text-yellow-700']
  };
  feedbackDiv.classList.add(...cores[tipo]);
  feedbackDiv.classList.remove('hidden');
  if (ms > 0) {
    setTimeout(() => feedbackDiv.classList.add('hidden'), ms);
  }
}

function resetarFormularioItemCatalogo() {
  if (formItemCatalogo) formItemCatalogo.reset();
  if (inputItemIdCatalogo) inputItemIdCatalogo.value = '';
  if (imagePreview) {
    imagePreview.src = '#';
    imagePreview.classList.add('hidden');
  }
  if (uploadPrompt) uploadPrompt.classList.remove('hidden');
  itemEmEdicaoUrlImagemAtual = null;
  if (checkboxDisponivel) checkboxDisponivel.checked = true;
  if (formTitulo) formTitulo.textContent = 'Adicionar Novo Item ao Catálogo';
  if (btnItemText) btnItemText.textContent = 'Salvar Item';
  if (inputFileImagemItem) inputFileImagemItem.value = null;
}

/* --- Lógica de Imagem ------------------------------------------------- */
if (inputFileImagemItem) {
  inputFileImagemItem.addEventListener('change', function(event) {
    console.log('Input de imagem alterado.');
    const file = event.target.files[0];
    if (file) {
      console.log('Arquivo selecionado:', file.name, file.type, file.size);
      const reader = new FileReader();
      reader.onload = function(e) {
        const resultPreview = e.target.result ? e.target.result.substring(0, 100) + '...' : 'Resultado do reader vazio';
        console.log('FileReader carregou para preview:', resultPreview);
        if (imagePreview) {
            imagePreview.src = e.target.result;
            imagePreview.classList.remove('hidden');
        }
        if (uploadPrompt) uploadPrompt.classList.add('hidden');
      }
      reader.onerror = function(e) {
          console.error('Erro no FileReader:', e);
          exibirMensagemFeedback('Erro ao tentar ler a imagem selecionada.', 'erro');
      }
      reader.readAsDataURL(file);
    } else {
      console.log('Nenhum arquivo selecionado ou input limpo.');
      if (imagePreview) {
        imagePreview.src = '#';
        imagePreview.classList.add('hidden');
      }
      if (uploadPrompt) uploadPrompt.classList.remove('hidden');
    }
  });
} else {
    console.warn("Elemento inputFileImagemItem não encontrado.");
}


/* --- CRUD para Itens do Catálogo -------------------------------------- */

async function handleFormSubmitItemCatalogo() {
  if (!currentUser) {
    exibirMensagemFeedback('Você precisa estar logado para salvar itens.', 'erro');
    return;
  }

  const nome = inputNomeItem.value.trim();
  const descricao = textareaDescricaoItem.value.trim();
  const categoria = inputCategoriaItem.value.trim() || null;
  const tagsInput = inputTagsItem.value.trim();
  const disponivel = checkboxDisponivel.checked;
  const itemId = inputItemIdCatalogo.value;
  const imagemFile = inputFileImagemItem.files[0];

  if (!nome || !descricao) {
    exibirMensagemFeedback('Nome e Descrição são obrigatórios.', 'aviso');
    return;
  }

  const tagsArray = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : null;

  btnItemText.textContent = itemId ? 'Salvando Alterações...' : 'Salvando Item...';
  btnItemSpinner.classList.remove('hidden');
  btnSalvarItem.disabled = true;

  let novaImagemUrl = itemEmEdicaoUrlImagemAtual;

  try {
    if (imagemFile) {
      const nomeArquivo = `public/${currentUser.id}/${Date.now()}_${imagemFile.name}`;
      console.log('Fazendo upload para BUCKET:', BUCKET_CATALOGO_IMAGENS, 'Arquivo:', nomeArquivo);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_CATALOGO_IMAGENS)
        .upload(nomeArquivo, imagemFile, {
          cacheControl: '3600',
          upsert: itemId ? true : false
        });

      if (uploadError) {
        console.error('Erro no upload para o Storage:', uploadError);
        throw uploadError;
      }
      console.log('Upload bem-sucedido. Dados do upload:', uploadData);

      console.log('Obtendo URL pública para:', nomeArquivo, 'do BUCKET:', BUCKET_CATALOGO_IMAGENS);
      const { data: publicUrlData, error: getUrlError } = await supabase.storage
        .from(BUCKET_CATALOGO_IMAGENS)
        .getPublicUrl(nomeArquivo);

      if (getUrlError) {
        console.error("Erro ao obter publicUrl:", getUrlError);
        throw new Error(`Falha ao obter URL pública da imagem: ${getUrlError.message}`);
      }
      if (!publicUrlData || !publicUrlData.publicUrl) {
        console.error("Retorno de getPublicUrl inválido:", publicUrlData);
        throw new Error("URL pública retornada é inválida ou nula.");
      }
      
      novaImagemUrl = publicUrlData.publicUrl;
      console.log('URL Pública obtida:', novaImagemUrl);

      if (itemId && itemEmEdicaoUrlImagemAtual && itemEmEdicaoUrlImagemAtual !== novaImagemUrl) {
        const caminhoAntigo = extrairCaminhoStorage(itemEmEdicaoUrlImagemAtual, BUCKET_CATALOGO_IMAGENS);
        if (caminhoAntigo) {
          console.log('Removendo imagem antiga do Storage:', caminhoAntigo);
          await supabase.storage.from(BUCKET_CATALOGO_IMAGENS).remove([caminhoAntigo]);
        }
      }
    }

    const itemData = {
      nome,
      descricao,
      categoria,
      tags: tagsArray,
      imagem_url: novaImagemUrl,
      disponivel_no_catalogo: disponivel,
      user_id: currentUser.id
    };
    console.log('Dados do item para salvar/atualizar no DB:', itemData);

    let dbError;
    if (itemId) {
      console.log('Atualizando item ID:', itemId);
      const { error } = await supabase
        .from(TABELA_CATALOGO_ITENS)
        .update(itemData)
        .eq('id', itemId)
        .eq('user_id', currentUser.id);
      dbError = error;
    } else {
      console.log('Inserindo novo item.');
      const { error } = await supabase
        .from(TABELA_CATALOGO_ITENS)
        .insert([itemData]);
      dbError = error;
    }

    if (dbError) {
        console.error('Erro no banco de dados:', dbError);
        throw dbError;
    }

    exibirMensagemFeedback(itemId ? 'Item atualizado com sucesso!' : 'Item salvo com sucesso no catálogo!', 'sucesso');
    resetarFormularioItemCatalogo();
    await carregarItensCatalogo();
    return true; // Indica sucesso para o listener do botão

  } catch (error) {
    console.error('Erro completo ao salvar item do catálogo:', error);
    exibirMensagemFeedback(`Erro ao salvar: ${error.message}`, 'erro', 0);
    return false; // Indica falha para o listener do botão
  } finally {
    // Resetar o botão apenas se não estiver mais em modo de edição (ou se o formulário foi resetado)
    if (!inputItemIdCatalogo.value) { // Se o ID do item foi limpo, estamos de volta ao modo de cadastro
        btnItemText.textContent = 'Salvar Item';
    }
    // Se inputItemIdCatalogo.value ainda existir (ex: erro de validação sem resetar o form), 
    // o texto do botão deve continuar "Salvar Alterações"
    btnItemSpinner.classList.add('hidden');
    btnSalvarItem.disabled = false;
  }
}

async function carregarItensCatalogo() {
  if (!currentUser) return;
  exibirMensagemFeedback('Carregando itens do catálogo...', 'aviso', 1500);

  const { data: itens, error } = await supabase
    .from(TABELA_CATALOGO_ITENS)
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao carregar itens do catálogo:', error);
    exibirMensagemFeedback('Falha ao carregar itens.', 'erro', 0);
    if (gridItensCatalogo) gridItensCatalogo.innerHTML = '<p class="col-span-full text-red-500">Erro ao carregar.</p>';
    return;
  }
  renderizarItensCatalogo(itens);
}

function renderizarItensCatalogo(itens) {
  if (!gridItensCatalogo) return;
  gridItensCatalogo.innerHTML = '';
  if (!itens || itens.length === 0) {
    if (pNenhumItem) pNenhumItem.classList.remove('hidden');
    return;
  }
  if (pNenhumItem) pNenhumItem.classList.add('hidden');

  itens.forEach(item => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-lg overflow-hidden border border-pink-100 flex flex-col';
    card.innerHTML = `
      <img src="${item.imagem_url || 'https://placehold.co/300x200/fce7f3/db2777?text=Sem+Imagem'}" alt="${item.nome}" class="w-full h-48 object-cover">
      <div class="p-4 flex flex-col flex-grow">
        <h3 class="text-md font-semibold text-pink-700 mb-1 truncate" title="${item.nome}">${item.nome}</h3>
        ${item.categoria ? `<span class="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full self-start mb-2">${item.categoria}</span>` : ''}
        <p class="text-xs text-gray-600 mb-2 flex-grow">${item.descricao.substring(0, 70)}${item.descricao.length > 70 ? '...' : ''}</p>
        <p class="text-xs text-gray-500 mb-3">Status: <span class="${item.disponivel_no_catalogo ? 'text-green-600 font-semibold' : 'text-gray-500'}">${item.disponivel_no_catalogo ? 'Visível' : 'Oculto'}</span></p>
        <div class="mt-auto flex space-x-2">
          <button data-action="editar" class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md transition-colors flex-grow">Editar</button>
          <button data-action="remover" class="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md transition-colors flex-grow">Remover</button>
        </div>
      </div>
    `;
    card.querySelector('button[data-action="editar"]').addEventListener('click', () => preencherFormParaEdicao(item));
    card.querySelector('button[data-action="remover"]').addEventListener('click', () => removerItemCatalogo(item));
    gridItensCatalogo.appendChild(card);
  });
}

function preencherFormParaEdicao(item) {
    if(formTitulo) formTitulo.textContent = `Editando Item: ${item.nome}`;
    if(inputItemIdCatalogo) inputItemIdCatalogo.value = item.id;
    if(inputNomeItem) inputNomeItem.value = item.nome;
    if(textareaDescricaoItem) textareaDescricaoItem.value = item.descricao;
    if(inputCategoriaItem) inputCategoriaItem.value = item.categoria || '';
    if(inputTagsItem) inputTagsItem.value = item.tags ? item.tags.join(', ') : '';
    if(checkboxDisponivel) checkboxDisponivel.checked = item.disponivel_no_catalogo;

    if (item.imagem_url) {
        if(imagePreview) {
            imagePreview.src = item.imagem_url;
            imagePreview.classList.remove('hidden');
        }
        if(uploadPrompt) uploadPrompt.classList.add('hidden');
        itemEmEdicaoUrlImagemAtual = item.imagem_url;
    } else {
        if(imagePreview) {
            imagePreview.src = '#';
            imagePreview.classList.add('hidden');
        }
        if(uploadPrompt) uploadPrompt.classList.remove('hidden');
        itemEmEdicaoUrlImagemAtual = null;
    }
    if(btnItemText) btnItemText.textContent = 'Salvar Alterações';
    
    const formSection = formItemCatalogo ? formItemCatalogo.closest('section') : null;
    if (formSection) {
        window.scrollTo({ top: formSection.offsetTop - 20, behavior: 'smooth'});
    }
    if(inputNomeItem) inputNomeItem.focus();
}

async function removerItemCatalogo(item) {
    if (!confirm(`Tem certeza que deseja remover o item "${item.nome}" do catálogo? Esta ação não pode ser desfeita.`)) return;

    exibirMensagemFeedback(`Removendo "${item.nome}"...`, 'aviso', 0);
    try {
        const { error: dbError } = await supabase
            .from(TABELA_CATALOGO_ITENS)
            .delete()
            .eq('id', item.id)
            .eq('user_id', currentUser.id);
        if (dbError) throw dbError;

        if (item.imagem_url) {
            const caminhoImagem = extrairCaminhoStorage(item.imagem_url, BUCKET_CATALOGO_IMAGENS);
            if (caminhoImagem) {
                console.log('Tentando remover imagem do Storage:', caminhoImagem);
                const { error: storageError } = await supabase.storage
                    .from(BUCKET_CATALOGO_IMAGENS)
                    .remove([caminhoImagem]);
                if (storageError) {
                    console.warn('Item deletado do banco, mas falha ao remover imagem do storage:', storageError.message);
                    exibirMensagemFeedback('Item removido, mas falha ao deletar imagem antiga do storage.', 'aviso', 0);
                } else {
                    console.log('Imagem removida do Storage com sucesso.');
                }
            }
        }
        exibirMensagemFeedback(`Item "${item.nome}" removido com sucesso!`, 'sucesso');
        await carregarItensCatalogo();
    } catch (error) {
        console.error('Erro ao remover item do catálogo:', error);
        exibirMensagemFeedback(`Erro ao remover: ${error.message}`, 'erro', 0);
    }
}

function extrairCaminhoStorage(urlCompleta, nomeBucket) {
    if (!urlCompleta || !nomeBucket) {
        console.warn('URL ou nome do bucket ausente para extrairCaminhoStorage');
        return null;
    }
    try {
        const urlObj = new URL(urlCompleta);
        const partesPath = urlObj.pathname.split('/');
        // Ex: /storage/v1/object/public/catalogo-imagens/public/userid/arquivo.jpg
        // Queremos: public/userid/arquivo.jpg
        const indiceBucket = partesPath.indexOf(nomeBucket);
        if (indiceBucket !== -1 && indiceBucket < partesPath.length - 1) {
            return partesPath.slice(indiceBucket + 1).join('/');
        } else {
            console.warn(`Bucket "${nomeBucket}" não encontrado na URL ou não há caminho após ele: ${urlCompleta}`);
            // Fallback para a lógica de prefixo, caso a URL seja a padrão do getPublicUrl
            const prefixoPadrao = `/storage/v1/object/public/${nomeBucket}/`;
            if (urlObj.pathname.startsWith(prefixoPadrao)) {
                return urlObj.pathname.substring(prefixoPadrao.length);
            }
        }
    } catch (e) { 
        console.error("Erro ao parsear URL para extrair caminho:", e, urlCompleta); 
    }
    console.warn("Não foi possível extrair o caminho do storage da URL:", urlCompleta);
    return null;
}

/* --- Autenticação e Inicialização ------------------------------------ */
async function initAdminCatalogoPage() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    console.error("Erro na sessão ou sessão não existente:", sessionError?.message);
    window.location.href = 'index.html';
    return;
  }
  currentUser = session.user;
  console.log("Usuário autenticado:", currentUser.id);


  const currentYearEl = document.getElementById('currentYearAdminCatalogo');
  if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
  }

  await carregarItensCatalogo();

  if (btnSalvarItem) {
    btnSalvarItem.addEventListener('click', handleFormSubmitItemCatalogo);
  } else {
    console.error("Botão 'btnSalvarItemCatalogo' não encontrado.");
  }
  if (btnLimparForm) {
    btnLimparForm.addEventListener('click', resetarFormularioItemCatalogo);
  } else {
    console.error("Botão 'btnLimparFormItemCatalogo' não encontrado.");
  }
}

window.logoutCatalogoAdmin = async function() {
  console.log("Fazendo logout...");
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Erro ao fazer logout:", error.message);
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', initAdminCatalogoPage);