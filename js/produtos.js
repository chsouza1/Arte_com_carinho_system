// js/produtos.js

const BUCKET = 'produtos';
const TABELA = 'produtos';

export function exibirMensagemFeedback(mensagem, tipo = 'sucesso', duracaoMs = 5000) {
  const feedbackDiv = document.getElementById('feedback-message');
  if (!feedbackDiv) return;

  feedbackDiv.textContent = mensagem;
  feedbackDiv.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700', 'bg-yellow-100', 'text-yellow-700'); // Limpa classes anteriores

  if (tipo === 'sucesso') {
    feedbackDiv.classList.add('bg-green-100', 'text-green-700');
  } else if (tipo === 'erro') {
    feedbackDiv.classList.add('bg-red-100', 'text-red-700');
  } else if (tipo === 'aviso') {
    feedbackDiv.classList.add('bg-yellow-100', 'text-yellow-700');
  }
  
  feedbackDiv.classList.remove('hidden');

  if (duracaoMs > 0) { 
    setTimeout(() => {
      feedbackDiv.classList.add('hidden');
    }, duracaoMs);
  }
}


async function getProdutos(supabase) {
  const { data, error } = await supabase
    .from(TABELA)
    .select('*')
    .order('nome', { ascending: true }); 

  if (error) {
    console.error('Erro ao buscar produtos:', error);
    exibirMensagemFeedback(`Erro ao buscar produtos: ${error.message}`, 'erro');
    return [];
  }
  return data;
}

function renderizarProdutos(produtos) {
  const listaProdutosEl = document.getElementById('lista-produtos');
  if (!listaProdutosEl) {
    console.error('Elemento #lista-produtos não encontrado no HTML!');
    return;
  }
  listaProdutosEl.innerHTML = ''; 

  if (!produtos || produtos.length === 0) {
    listaProdutosEl.innerHTML = '<p class="text-center text-gray-500 col-span-full">Nenhum produto cadastrado ainda. Que tal adicionar um?</p>';
    return;
  }
  produtos.forEach(produto => {
    const card = document.createElement('div');
    card.className = 'bg-white p-4 rounded-xl shadow-lg space-y-2 transform hover:scale-105 transition-transform duration-300';
    const img = document.createElement('img');
    img.src = produto.imagem_url;
    img.alt = produto.nome;
    img.className = 'w-full h-48 object-cover rounded-md mb-3 shadow';
    const nomeProduto = document.createElement('h3');
    nomeProduto.className = 'text-lg font-semibold text-pink-700';
    nomeProduto.textContent = produto.nome;
    const precoProduto = document.createElement('p');
    precoProduto.className = 'text-md text-gray-700';
    precoProduto.textContent = `Preço: ${parseFloat(produto.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    const qtdProduto = document.createElement('p');
    qtdProduto.className = 'text-md text-gray-700';
    qtdProduto.textContent = `Estoque: ${produto.quantidade} unidade(s)`;
    card.appendChild(img);
    card.appendChild(nomeProduto);
    card.appendChild(precoProduto);
    card.appendChild(qtdProduto);
    listaProdutosEl.appendChild(card);
  });
}

export async function carregarEExibirProdutos(supabase) {
  const produtos = await getProdutos(supabase);
  renderizarProdutos(produtos);
}

export async function cadastrarProduto(supabase) {
  const nome = document.getElementById('nome').value.trim();
  const precoInput = document.getElementById('preco').value;
  const quantidadeInput = document.getElementById('quantidade').value;
  const imageFile = document.getElementById('imagem').files[0];

  if (!nome || precoInput === '' || quantidadeInput === '' || !imageFile) {
    exibirMensagemFeedback('Por favor, preencha todos os campos do formulário e selecione uma imagem.', 'aviso');
    return; 
  }

  const preco = parseFloat(precoInput);
  const quantidade = parseInt(quantidadeInput);

  if (isNaN(preco) || preco <= 0) {
    exibirMensagemFeedback('O preço deve ser um número válido e maior que zero.', 'aviso');
    return;
  }
  if (isNaN(quantidade) || quantidade < 0) {
    exibirMensagemFeedback('A quantidade deve ser um número válido e não negativo.', 'aviso');
    return;
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Não foi possível obter o usuário autenticado. Faça login novamente.');
    }

    const filePath = `public/${user.id}/${Date.now()}_${imageFile.name}`;
    const { error: upError } = await supabase.storage.from(BUCKET).upload(filePath, imageFile, { cacheControl: '3600', upsert: false });
    if (upError) throw upError;

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    if (!urlData || !urlData.publicUrl) {
      throw new Error('Não foi possível obter a URL pública da imagem.');
    }
    const publicUrl = urlData.publicUrl;

    const { error: dbError } = await supabase.from(TABELA).insert([{ nome, preco, quantidade, imagem_url: publicUrl }]);
    if (dbError) throw dbError;

    exibirMensagemFeedback('Produto cadastrado com sucesso! 🎉', 'sucesso');
    limparCampos();
    await carregarEExibirProdutos(supabase);
  } catch (err) {
    console.error('Erro detalhado ao cadastrar produto:', err);
    exibirMensagemFeedback(`Erro ao cadastrar produto: ${err.message}`, 'erro', 0);
  }
}

function limparCampos() {
  document.getElementById('nome').value = '';
  document.getElementById('preco').value = '';
  document.getElementById('quantidade').value = '';
  document.getElementById('imagem').value = '';

  const imagePreview = document.getElementById('imagePreview');
  const noImageText = document.getElementById('noImageText');
  const uploadPrompt = document.getElementById('upload-prompt'); // Adicione esta linha

  if (imagePreview) {
    imagePreview.src = "#";
    imagePreview.classList.add('hidden');
  }
  if(noImageText) {
    noImageText.classList.remove('hidden');
  }
  if(uploadPrompt) { 
    uploadPrompt.classList.remove('hidden');
  }
}