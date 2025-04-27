import { databases, storage } from "./auth.js";

window.cadastrarProduto = async () => {
  const nome = document.getElementById('nome').value
  const preco = parseFloat(document.getElementById('preco').value)
  const quantidade = parseInt(document.getElementById('quantidade').value)
  const imageFile = document.getElementById('imagem').files[0]

  if (!nome || !preco || !quantidade || !imageFile) {
    alert('Preencha todos os campos')
    return
  }
try {
  const fileUpload = await storage.createFile(
    '680d428a002fb94167bb',
    'Appwrite.ID.unique()',
    imageFile
  )

  console.log('Arquivo Enviado:',fileUpload);

  const imagemUrl = 'https://fra.cloud.appwrite.io/v1/storage/buckets/680d428a002fb94167bb/files/$%7BfileUpload.$id%7D/view?project=680d3f8f00318a5de7b9'

  await databases.createDocument(
    '680d408b003c20e52411',
    '680d4213001f5a9f346e',
    Appwrite.ID.unique(),
    {
      nome: nome,
      preco: preco,
      quantidade: quantidade,
      imagem_url: imagemUrl
    }
  );

    alert('Produto Cadastrado com Sucesso! ');
    limparCampos();
  } catch (error) {
    console.error('Erro ao cadastrar o produto:',error);
    alert('Erro ao Cadastrar Produto. Veja o console.');
  }
}

function limparCampos() {
  document.getElementById('nome').value = '';
  document.getElementById('preco').value = '';
  document.getElementById('quantidade').value = '';
  document.getElementById('imagem').value = '';
}

window.cadastrarProduto = cadastrarProduto;