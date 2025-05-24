const BUCKET = 'produtos';
const TABELA = 'produtos';

let produtoEditandoId = null;

export function exibirMensagemFeedback(msg, tipo = 'sucesso', ms = 5000) {
  const box = document.getElementById('feedback-message');
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

async function getProdutos(supabase, sortOption = 'created_at_desc') {
  let field = 'created_at';
  let direction = 'desc';

  if (sortOption) {
    const parts = sortOption.split('_');
    field = parts[0];
    if (parts.length > 1 && ['asc', 'desc'].includes(parts[parts.length - 1])) {
      direction = parts[parts.length - 1];
      if (parts.length > 2) {
        field = parts.slice(0, -1).join('_'); 
      }
    }
  }

  const allowedSortFields = ['created_at', 'nome', 'preco', 'quantidade'];
  if (!allowedSortFields.includes(field)) {
    console.warn(`Campo de ordenação "${field}" não permitido. Usando "created_at".`);
    field = 'created_at';
  }

  const { data, error } = await supabase
    .from(TABELA)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    exibirMensagemFeedback('Erro ao buscar produtos: ' + error.message, 'erro', 0);
    console.error(error);
    return [];
  }
  return data;
}

function renderizarProdutos(lista, supabase) { 
  const el = document.getElementById('lista-produtos');
  if (!el) return;

  el.innerHTML = '';
  if (!lista || lista.length === 0) { 
    el.innerHTML = '<p class="text-center col-span-full text-gray-500">Nenhum produto cadastrado.</p>';
    return;
  }

  lista.forEach(p => {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'bg-white p-4 rounded-xl shadow space-y-2 hover:shadow-lg transition flex flex-col justify-between';
    cardDiv.innerHTML = `
       <div class="relative">
        <img src="${p.imagem_url}" alt="Imagem de ${p.nome}" class="w-full h-52 object-cover transition-transform duration-300 group-hover:scale-110">
        ${p.quantidade < 5 ? `<span class="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">Baixo Estoque!</span>` : ''}
        ${p.quantidade == 0 ? `<span class="absolute top-2 right-2 bg-gray-700 text-white text-xs font-semibold px-2 py-1 rounded-full">ESGOTADO</span>` : ''}

      </div>
      <div class="p-5 flex flex-col flex-grow">
        <h3 class="text-xl font-bold text-pink-700 mb-1 truncate" title="${p.nome}">${p.nome}</h3>
        <p class="text-lg font-semibold text-pink-500 mb-2">R$ ${Number(p.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p class="text-sm text-gray-500 mb-3">Estoque: ${p.quantidade} unidade(s)</p>
        
        <div class="flex-grow"></div> 
        
        <div class="mt-auto pt-4 border-t border-pink-100 flex justify-end space-x-2">
          <button data-action="editar" data-id="${p.id}" class="text-sm bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:shadow-md transition-all duration-200 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Editar
          </button>
          <button data-action="remover" data-id="${p.id}" class="text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:shadow-md transition-all duration-200 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Remover
          </button>
        </div>
      </div>
    `;
    
    cardDiv.querySelector('button[data-action="editar"]').addEventListener('click', () => {
      iniciarEdicaoProduto(p); 
    });
    cardDiv.querySelector('button[data-action="remover"]').addEventListener('click', () => {
      removerProduto(p.id, supabase); 
    });

    el.appendChild(cardDiv);
  });
}

export async function carregarEExibirProdutos(supabase, sortOption) {
  const lista = await getProdutos(supabase, sortOption);
  renderizarProdutos(lista, supabase);
}

function iniciarEdicaoProduto(produto) {
  document.getElementById('nome').value = produto.nome;
  document.getElementById('preco').value = produto.preco;
  document.getElementById('quantidade').value = produto.quantidade;
  
  const imagePreview = document.getElementById('imagePreview');
  const uploadPrompt = document.getElementById('upload-prompt');
  const noImageText = document.getElementById('noImageText');

  imagePreview.src = produto.imagem_url;
  imagePreview.classList.remove('hidden');
  uploadPrompt.classList.add('hidden');
  noImageText.classList.add('hidden');
  
  produtoEditandoId = produto.id;
  
  document.getElementById('btnText').textContent = 'Salvar Alterações';
  document.getElementById('btnCadastrar').dataset.modo = 'editar';
  
  let btnCancelar = document.getElementById('btnCancelarEdicao');
  if (!btnCancelar) {
    btnCancelar = document.createElement('button');
    btnCancelar.id = 'btnCancelarEdicao';
    btnCancelar.type = 'button';
    btnCancelar.textContent = 'Cancelar Edição';
    btnCancelar.className = 'w-full mt-2 bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors text-sm';
    btnCancelar.onclick = () => resetarFormularioParaCadastro();
    document.getElementById('form-cadastro-produto').appendChild(btnCancelar);
  }
  btnCancelar.classList.remove('hidden');

  window.scrollTo({ top: document.getElementById('cadastro-produto-section').offsetTop - 20, behavior: 'smooth' });
  document.getElementById('nome').focus();
  exibirMensagemFeedback(`Editando produto: ${produto.nome}. Modifique os campos e clique em "Salvar Alterações". Deixe a imagem em branco se não quiser alterá-la.`, 'aviso', 8000);
}

function resetarFormularioParaCadastro() {
    limparCampos();
    produtoEditandoId = null;
    document.getElementById('btnText').textContent = 'Cadastrar Produto';
    document.getElementById('btnCadastrar').removeAttribute('data-modo');

    const btnCancelar = document.getElementById('btnCancelarEdicao');
    if (btnCancelar) {
        btnCancelar.classList.add('hidden');
    }
    exibirMensagemFeedback('Modo de cadastro reativado.', 'sucesso', 3000);
}

export async function cadastrarProduto(supabase) {
  const nome = document.getElementById('nome').value.trim();
  const precoInput = document.getElementById('preco').value;
  const quantidadeInput = document.getElementById('quantidade').value;
  const file = document.getElementById('imagem').files[0];

  if (!nome || precoInput === '' || quantidadeInput === '') { 
    exibirMensagemFeedback('Nome, preço e quantidade são obrigatórios.', 'aviso');
    return false;
  }
  if (!produtoEditandoId && !file) {
      exibirMensagemFeedback('A imagem é obrigatória para novos produtos.', 'aviso');
      return false;
  }

  const preco = parseFloat(precoInput);
  const quantidade = parseInt(quantidadeInput);

  if (isNaN(preco) || preco <= 0) {
    exibirMensagemFeedback('O preço deve ser um número válido e maior que zero.', 'aviso');
    return false;
  }
  if (isNaN(quantidade) || quantidade < 0) {
    exibirMensagemFeedback('A quantidade deve ser um número válido e não negativo.', 'aviso');
    return false;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado.');

    let publicUrl = document.getElementById('imagePreview').src;
    let imagemFoiAlterada = false;

    if (file) { 
      imagemFoiAlterada = true;
      const filePath = `public/${user.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(filePath, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
      if (!urlData || !urlData.publicUrl) throw new Error('Não foi possível obter a URL pública da nova imagem.');
      publicUrl = urlData.publicUrl;
    }

    const dadosProduto = {
      nome,
      preco,
      quantidade,
      imagem_url: publicUrl,
    };
    
    if (produtoEditandoId) { 
      const { error: updateErr } = await supabase
        .from(TABELA)
        .update(dadosProduto)
        .eq('id', produtoEditandoId);
      if (updateErr) throw updateErr;
      exibirMensagemFeedback('Produto atualizado com sucesso! ✨');
    } else { 
      const { error: dbErr } = await supabase
        .from(TABELA)
        .insert([dadosProduto]);
      if (dbErr) throw dbErr;
      exibirMensagemFeedback('Produto cadastrado! 🎉');
    }

    resetarFormularioParaCadastro(); 
    await carregarEExibirProdutos(supabase);
    return true;

  } catch (err) {
    console.error(err);
    exibirMensagemFeedback('Erro: ' + err.message, 'erro', 0);
    return false;
  }
}

function extrairCaminhoDoStorageDaUrl(urlCompleta, nomeDoBucket) {
  if (!urlCompleta || !nomeDoBucket) {
    console.warn('URL completa ou nome do bucket não fornecido para extração do caminho.');
    return null;
  }
  try {
    const urlObj = new URL(urlCompleta);
    const partesPath = urlObj.pathname.split('/');
    const indiceBucket = partesPath.indexOf(nomeDoBucket);

    if (indiceBucket !== -1 && indiceBucket < partesPath.length - 1) {
      return partesPath.slice(indiceBucket + 1).join('/');
    } else {
      console.warn(`Não foi possível encontrar o bucket "${nomeDoBucket}" na URL ou não há caminho após ele: ${urlCompleta}`);
      const prefixoPadrao = `/storage/v1/object/public/${nomeDoBucket}/`;
      if (urlObj.pathname.startsWith(prefixoPadrao)) {
          return urlObj.pathname.substring(prefixoPadrao.length);
      }
      console.warn(`URL da imagem não corresponde a nenhum padrão esperado para o bucket "${nomeDoBucket}": ${urlCompleta}`);
      return null;
    }
  } catch (e) {
    console.error('Erro ao parsear a URL da imagem:', e, urlCompleta);
    return null;
  }
}

async function removerProduto(id, supabase) { 
  const produtoCard = document.querySelector(`button[data-id="${id}"][data-action="remover"]`)?.closest('.bg-white');
  const nomeProdutoParaMensagem = produtoCard ? produtoCard.querySelector('h3')?.textContent : `Produto ID ${id.substring(0,8)}`;

  const confirmado = confirm(`Tem certeza que deseja remover o produto "${nomeProdutoParaMensagem}"?\nEsta ação também tentará remover a imagem associada.`);
  if (!confirmado) return;

  exibirMensagemFeedback(`Removendo "${nomeProdutoParaMensagem}"...`, 'aviso', 0); 

  let urlImagemParaDeletar = null;

  try {
    const { data: produto, error: fetchError } = await supabase
      .from(TABELA) 
      .select('imagem_url')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.warn(`Aviso ao buscar URL da imagem para produto ID ${id}: ${fetchError.message}. Tentando deletar registro do banco mesmo assim.`);
    } else if (produto && produto.imagem_url) {
      urlImagemParaDeletar = produto.imagem_url;
    }

    const { error: deleteDbError } = await supabase
      .from(TABELA)
      .delete()
      .eq('id', id);

    if (deleteDbError) {
      throw deleteDbError;
    }

    let mensagemFinal = `Produto "${nomeProdutoParaMensagem}" removido do banco de dados.`;
    let tipoMensagemFinal = 'sucesso';

    if (urlImagemParaDeletar) {
      const caminhoArquivoNoBucket = extrairCaminhoDoStorageDaUrl(urlImagemParaDeletar, BUCKET);
      
      if (caminhoArquivoNoBucket) {
        console.log(`Tentando remover do Storage: Bucket='${BUCKET}', Caminho='${caminhoArquivoNoBucket}'`);
        const { error: storageError } = await supabase.storage
          .from(BUCKET)
          .remove([caminhoArquivoNoBucket]);

        if (storageError) {
          console.error('Erro ao remover imagem do Storage:', storageError);
          mensagemFinal += ` Mas falha ao remover a imagem do Storage: ${storageError.message}`;
          tipoMensagemFinal = 'aviso'; 
        } else {
          mensagemFinal += ' Imagem associada também removida do Storage.';
        }
      } else {
        mensagemFinal += ' Não foi possível determinar o caminho da imagem no Storage para remoção.';
        tipoMensagemFinal = 'aviso';
      }
    } else {
      mensagemFinal += ' Nenhuma imagem associada encontrada para remover do Storage.';
    }

    exibirMensagemFeedback(mensagemFinal, tipoMensagemFinal, tipoMensagemFinal === 'sucesso' ? 5000 : 0);
    await carregarEExibirProdutos(supabase); 

  } catch (err) {
    console.error(`Erro completo ao remover produto ID ${id}:`, err);
    exibirMensagemFeedback(`Erro ao remover produto "${nomeProdutoParaMensagem}": ${err.message}`, 'erro', 0);
  }
}

export function limparCampos() {
  ['nome','preco','quantidade','imagem'].forEach(id => 
    document.getElementById(id).value = '');
  
  const imagePreview = document.getElementById('imagePreview');
  const noImageText = document.getElementById('noImageText');
  const uploadPrompt = document.getElementById('upload-prompt');

  if (imagePreview) {
    imagePreview.src = "#";
    imagePreview.classList.add('hidden');
  }
  if (noImageText) {
    noImageText.classList.remove('hidden');
  }
  if (uploadPrompt) {
    uploadPrompt.classList.remove('hidden');
  }
}