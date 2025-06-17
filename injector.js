(function () {

let serverProcessStarted = false;

(async () => {
 try {
    const res = await fetch("http://localhost:8765/start_server", { method: "GET" });
    if (res.ok) {
      console.log("Сервер уже запущен.");
      serverProcessStarted = true;
      document.getElementById('server-status-indicator').style.backgroundColor = 'limegreen';
    }
  } catch (e) {
    console.log("Запуск сервера code_executor.py...");

  }
})();


  function insertToChatGPTPrompt(text) {
    const textarea = document.querySelector('div[contenteditable="true"]');
    if (!textarea) {
      alert('Не удалось найти поле ввода ChatGPT');
      return;
    }

    textarea.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);

    const inputEvent = new Event('input', { bubbles: true });
    textarea.dispatchEvent(inputEvent);
  }

  async function insertToChatGPTPromptAndSend(text) {
    const textarea = document.querySelector('div[contenteditable="true"]');
    if (!textarea) {
      alert('Не удалось найти поле ввода ChatGPT');
      return;
    }

    textarea.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);

    const inputEvent = new Event('input', { bubbles: true });
    textarea.dispatchEvent(inputEvent);

    await new Promise(r => setTimeout(r, 100));

    const enterEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13
    });

    textarea.dispatchEvent(enterEvent);
  }

  const cleanCodeBlock = (code) => {
    return code
      .split('\n')
      .filter(line => !/^c$/.test(line.trim()))
      .filter(line => !/^Копировать$/.test(line.trim()))
      .filter(line => !/^Редактировать$/.test(line.trim()))
      .join('\n');
  };

  async function sendCode(action, code, flags = "") {
    const res = await fetch("http://localhost:8765/compile_run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, code, flags })
    });
    return res.text();
  }

  const existing = document.getElementById('chatgpt-c-output-sidebar');
  if (existing) existing.remove();

  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    top: '0',
    right: '0',
    width: '550px',
    height: '100vh',
    backgroundColor: '#f4f4f4',
    color: '#000',
    fontFamily: 'monospace',
    fontSize: '13px',
    overflowY: 'auto',
    zIndex: '99999',
    borderLeft: '2px solid #888',
    display: 'flex',
    flexDirection: 'column'
  });
  container.id = 'chatgpt-c-output-sidebar';

  const header = document.createElement('div');
  header.style.padding = '8px';
  header.style.backgroundColor = '#ddd';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';

  
  
const headerLeft = document.createElement('div');
headerLeft.style.display = 'flex';
headerLeft.style.alignItems = 'center';

const title = document.createElement('span');
title.textContent = 'ChatGPT C Runner';
title.style.marginRight = '10px';

const statusIndicator = document.createElement('div');
statusIndicator.id = 'server-status-indicator';
Object.assign(statusIndicator.style, {
  width: '14px',
  height: '14px',
  borderRadius: '50%',
  backgroundColor: '#aaa',
  boxShadow: '0 0 4px rgba(0,0,0,0.3)',
  border: '1px solid #444'
});

headerLeft.append(title, statusIndicator);
  
  

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✖';
  Object.assign(closeBtn.style, {
    background: 'transparent',
    border: 'none',
    color: '#900',
    cursor: 'pointer',
    fontSize: '16px'
  });
  closeBtn.onclick = () => container.remove();

  header.append(statusIndicator,title,closeBtn);
  container.appendChild(header);

  const pres = Array.from(document.querySelectorAll('pre'));
  if (pres.length === 0) {
    alert("Код не найден.");
    return;
  }

  function findLastCBlockIndex(pres) {
    function hasCLanguageHeader(element) {
      const headers = element.querySelectorAll(
        'div.flex.items-center.text-token-text-secondary.px-4.py-2.text-xs.font-sans.justify-between.h-9.bg-token-sidebar-surface-primary.dark\\:bg-token-main-surface-secondary.select-none.rounded-t-2xl'
      );

      for (const header of headers) {
        if (header.textContent.trim() === 'c') {
          return true;
        }
      }
      return false;
    }

    function hasCopyButtonBlockNearby(element) {
      const stickyBlocks = element.querySelectorAll('div.sticky.top-9');
      for (const stickyBlock of stickyBlocks) {
        if (stickyBlock.querySelector('button[aria-label="Копировать"]')) {
          return true;
        }
      }

      let nextElem = element.nextElementSibling;
      while (nextElem) {
        if (nextElem.classList && nextElem.classList.contains('sticky') && nextElem.classList.contains('top-9')) {
          if (nextElem.querySelector('button[aria-label="Копировать"]')) {
            return true;
          }
        }
        nextElem = nextElem.nextElementSibling;
      }
      return false;
    }

    for (let i = pres.length - 1; i >= 0; i--) {
      const el = pres[i];
      if (hasCLanguageHeader(el) && hasCopyButtonBlockNearby(el)) {
        return i;
      }
    }
    return -1;
  }

  const selector = document.createElement('select');
  selector.style.margin = '5px 10px';
  selector.style.padding = '4px';

  pres.forEach((pre, i) => {
    const firstLine = pre.innerText.split('\n')[0].slice(0, 30).trim();
    selector.add(new Option(`Блок ${i + 1}: "${firstLine}..."`, i));
  });

  const lastCIndex = findLastCBlockIndex(pres);
  selector.value = lastCIndex;

  const compilerFlagsInput = document.createElement('input');
  compilerFlagsInput.type = 'text';
  compilerFlagsInput.placeholder = 'Параметры компиляции (например: -Wall -O2)';
  Object.assign(compilerFlagsInput.style, {
    margin: '5px 10px',
    padding: '4px',
    fontSize: '13px',
    width: 'calc(100% - 20px)'
  });

  const textarea = document.createElement('textarea');
  Object.assign(textarea.style, {
    flex: '1',
    margin: '10px',
    width: 'calc(100% - 20px)',
    height: '200px',
    fontFamily: 'monospace',
    fontSize: '13px',
    whiteSpace: 'pre',
  });

  textarea.value = cleanCodeBlock(pres[lastCIndex].innerText);

  selector.onchange = () => {
    textarea.value = cleanCodeBlock(pres[selector.value].innerText);
  };

  container.appendChild(selector);
  container.appendChild(compilerFlagsInput);
  container.appendChild(textarea);

  const btnContainer = document.createElement('div');
  btnContainer.style.margin = '5px 10px';

  const output = document.createElement('pre');
  Object.assign(output.style, {
    flex: '1',
    margin: '10px',
    padding: '10px',
    backgroundColor: '#000',
    color: '#0f0',
    overflow: 'auto'
  });

['Скомпилировать', 'Запустить', 'Скопировать в промпт', 'Авто'].forEach(label => {
  const btn = document.createElement('button');
  btn.textContent = label;
  Object.assign(btn.style, {
    marginRight: '10px',
    padding: '8px 14px',
    fontSize: '14px',
    fontWeight: 'bold',
    background: 'linear-gradient(145deg, #e6e6e6, #ffffff)',
    border: '1px solid #ccc',
    borderRadius: '8px',
    boxShadow: '3px 3px 6px #ccc, -2px -2px 5px #fff',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out'
  });

  btn.onmouseenter = () => {
    btn.style.boxShadow = 'inset 2px 2px 4px #ccc, inset -2px -2px 5px #fff';
    btn.style.background = '#f0f0f0';
  };
  btn.onmouseleave = () => {
    btn.style.boxShadow = '3px 3px 6px #ccc, -2px -2px 5px #fff';
    btn.style.background = 'linear-gradient(145deg, #e6e6e6, #ffffff)';
  };

  btn.onclick = async () => {
    const code = textarea.value;
    const flags = compilerFlagsInput.value;
    let action = label === 'Авто' ? 'auto' :
                 label === 'Скомпилировать' ? 'compile' :
                 label === 'Запустить' ? 'run' : 'copy';

    output.textContent = 'Обработка...';
    const result = await sendCode(action, code, flags);
    output.textContent = result;

    if (action === 'copy') {
      insertToChatGPTPrompt(result);
    } else if (action === 'auto') {
      insertToChatGPTPromptAndSend(result);
    }
  };

  btnContainer.appendChild(btn);
});


  container.appendChild(btnContainer);
  container.appendChild(output);
  document.body.appendChild(container);
})();

