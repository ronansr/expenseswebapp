---
name: markitdown
description: Converte arquivos e documentos de escritorio para Markdown com o MarkItDown da Microsoft. Use quando for preciso LER ou EXTRAIR o conteudo de PDF, Word (docx), Excel (xlsx/xls), PowerPoint (pptx), imagem, audio, HTML, CSV/JSON/XML, ZIP, EPub ou URL de YouTube — para resumir, comparar, indexar, virar documentacao ou alimentar um prompt. Tambem use quando o usuario citar MarkItDown, pedir "transforma esse PDF em texto", "le essa planilha", "extrai o contrato", "converte para markdown", ou entregar um anexo que as ferramentas de leitura de arquivo nao abrem.
metadata:
  upstream: "https://github.com/microsoft/markitdown"
  license: MIT (Microsoft)
---

# MarkItDown — arquivo binario vira Markdown

MarkItDown e uma ferramenta Python da Microsoft que converte documentos em Markdown
**para consumo de LLM**: ele preserva a estrutura que importa (titulos, listas, tabelas,
links) e descarta a fidelidade visual. Nao e um conversor de alta fidelidade para humano
imprimir — e o jeito de fazer um PDF de 40 paginas caber num contexto.

⚠️ **Esta skill e um invólucro escrito por nós.** O repositorio da Microsoft nao publica
um `SKILL.md`; o que existe la e a biblioteca, o CLI e um servidor MCP. Ver `ORIGEM.md`.

## Quando NAO usar

- O arquivo e `.txt`, `.md`, `.py`, `.ts`, `.json` ou qualquer texto puro → leia direto.
  Instalar um conversor para ler um arquivo que ja e texto e trabalho jogado fora.
- O que se quer e a **aparencia** do documento (layout, fonte, paginacao). MarkItDown
  joga isso fora de proposito.

## Instalar

Requer Python 3.10+. Prefira um ambiente isolado — instalar `markitdown[all]` no Python
do sistema arrasta dezenas de dependencias (`onnxruntime`, `pdfminer`, `openpyxl`…).

```bash
# de uma vez, sem sujar o sistema (recomendado)
uvx --from 'markitdown[all]' markitdown arquivo.pdf -o arquivo.md

# ou instalado de vez
pip install 'markitdown[all]'
```

Da para instalar so o que o formato pede, em vez do `[all]`:
`[pdf]` `[docx]` `[xlsx]` `[xls]` `[pptx]` `[outlook]` `[audio-transcription]`
`[youtube-transcription]` `[az-doc-intel]` `[az-content-understanding]`.

## Usar

```bash
markitdown contrato.pdf -o contrato.md     # forma preferida: grava em arquivo
markitdown planilha.xlsx > planilha.md     # redirecionamento tambem serve
cat relatorio.pdf | markitdown             # aceita stdin
markitdown --list-plugins                  # plugins de terceiro (desligados por padrao)
markitdown arquivo.pdf --use-plugins       # liga os plugins instalados
```

**Grave em arquivo e leia o arquivo** — nao despeje o markdown inteiro no terminal. Um
PDF de 40 paginas vira dezenas de milhares de tokens de saida que ninguem escolheu
carregar; com o `-o`, o resultado fica em disco e so o trecho relevante e lido depois.

Python, quando o resultado precisa ser tratado:

```python
from markitdown import MarkItDown
print(MarkItDown().convert("teste.xlsx").text_content)
```

## Os casos que dao errado

- **PDF escaneado (imagem de pagina) sai vazio ou quase.** Nao ha texto para extrair, e o
  conversor padrao nao faz OCR. Saidas: o plugin `markitdown-ocr` (`pip install
  markitdown-ocr`, usa LLM de visao) ou o Azure Document Intelligence
  (`markitdown arq.pdf -o arq.md -d -e "<endpoint>"`), que e chamada de API paga.
  ⚠️ **Um resultado quase vazio nao e "documento sem conteudo"** — confira o tamanho do
  markdown contra o do original antes de concluir qualquer coisa sobre o documento.
- **Tabela complexa vira tabela torta.** Celula mesclada e tabela sem borda sao o ponto
  fraco conhecido. Confira os numeros que forem usados para decidir alguma coisa.
- **Ele executa I/O com o privilegio do processo**: baixa URL, abre caminho local, itera
  dentro de ZIP. Arquivo de origem desconhecida e entrada nao confiavel.
- **A transcricao de audio e a descricao de imagem por LLM custam dinheiro** (chave da
  OpenAI ou do Azure). Nada disso acontece sozinho — so com `llm_client` ou endpoint
  configurado.

## Como isto se encaixa neste repositorio

Serve para trazer para dentro do projeto o que chega em formato fechado: contrato do
agregador de SMS, tabela de precos de PSP, documentacao em PDF do iFood ou da SEFAZ,
planilha de bairros que o lojista mandou. O destino do texto convertido e um arquivo de
trabalho — **nao versione o markdown gerado** a menos que ele vire documentacao de
verdade.
