// produtos.js
import { supabase } from '../login.js';      // supabase já criado em auth.js

// bucket e tabela que você criou no painel
const BUCKET   = 'produtos';              // nome do bucket no Storage
const TABELA   = 'produtos';              // nome da tabela no DB

// ✔️ única função pública (fica no escopo global p/ onclick)
window.cadastrarProduto = async () => {
  // 1. pega os campos
  const nome        = document.getElementById('nome').value.trim();
  const preco       = parseFloat(document.getElementById('preco').value);
  const quantidade  = parseInt(document.getElementById('quantidade').value);
  const imageFile   = document.getElementById('imagem').files[0];

  if (!nome || !preco || !quantidade || !imageFile) {
    alert('Preencha todos os campos.');
    return;
  }

  try {
    /* 2. upload da imagem -------------------------------------------------- */
    // cria um nome único p/ o arquivo
    const filePath = `${Date.now()}_${imageFile.name}`;
    const { error: upError } = await supabase
      .storage
      .from(BUCKET)
      .upload(filePath, imageFile, { cacheControl: '3600', upsert: false });

    if (upError) throw upError;

    // URL pública da imagem
    const { data: { publicUrl } } = supabase
      .storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    /* 3. grava o produto no banco ----------------------------------------- */
    const { error: dbError } = await supabase
      .from(TABELA)
      .insert([
        { nome, preco, quantidade, imagem_url: publicUrl }
      ]);

    if (dbError) throw dbError;

    alert('Produto cadastrado com sucesso! 🎉');
    limparCampos();
  } catch (err) {
    console.error('Erro ao cadastrar produto:', err);
    alert('Erro ao cadastrar produto. Veja o console.');
  }
};

/* ----------------------------------------------------------------------- */
function limparCampos() {
  document.getElementById('nome').value       = '';
  document.getElementById('preco').value      = '';
  document.getElementById('quantidade').value = '';
  document.getElementById('imagem').value     = '';
}
