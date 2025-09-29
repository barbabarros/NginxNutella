document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('input');
    const botaoCopiar = document.getElementById('botao_copiar');

    const opcoes = {
        nome_arquivo_conf: document.getElementById('nome_arquivo_conf'),
        comando_nano: document.getElementById('comando_nano'),
        copiar_comando_nano: document.getElementById('copiar_comando_nano'),
        comando_link_simbolico: document.getElementById('comando_link_simbolico'),
        copiar_link_simbolico: document.getElementById('copiar_link_simbolico'),
        nome_servidor: document.getElementById('nome_servidor'),
        raiz_documentos: document.getElementById('raiz_documentos'),
        copiar_reiniciar: document.getElementById('copiar_reiniciar'),
        tamanho_max_body: document.getElementById('tamanho_max_body'),
        http2: document.getElementById('http2'),
        container_http2: document.getElementById('container_http2'),
        gzip: document.getElementById('gzip'),
        cabecalhos_seguranca: document.getElementById('cabecalhos_seguranca'),
        proxy_reverso: document.getElementById('proxy_reverso'),
        container_proxy: document.getElementById('container_proxy'),
        endereco_proxy: document.getElementById('endereco_proxy'),
        suporte_ws_principal: document.getElementById('suporte_ws_principal'),
        proxies_adicionais: document.getElementById('proxies_adicionais'),
        adicionar_proxy: document.getElementById('adicionar_proxy'),
        ssl: document.getElementById('ssl'),
        container_opcoes_ssl: document.getElementById('container_opcoes_ssl'),
        certificado_ssl: document.getElementById('certificado_ssl'),
        chave_ssl: document.getElementById('chave_ssl'),
        config_nginx: document.getElementById('config_nginx')
    };

    let proxiesAdicionais = [];

    function atualizarComandosArquivo() {
        const nomeArquivo = opcoes.nome_arquivo_conf.value || 'meusite.conf';
        opcoes.comando_nano.textContent = `sudo nano /etc/nginx/sites-available/${nomeArquivo}`;
        opcoes.comando_link_simbolico.textContent = `sudo ln -s /etc/nginx/sites-available/${nomeArquivo} /etc/nginx/sites-enabled/`;
    }

    function atualizarCaminhosSSL() {
        if (opcoes.ssl.checked) {
            const dominio = opcoes.nome_servidor.value || 'example.com';
            opcoes.certificado_ssl.value = `/etc/letsencrypt/live/${dominio}/fullchain.pem`;
            opcoes.chave_ssl.value = `/etc/letsencrypt/live/${dominio}/privkey.pem`;
        }
    }

    function gerarConfigNginx() {
        const nomeServidor = opcoes.nome_servidor.value || 'exemplo.com.br';
        const raizDocumentos = opcoes.raiz_documentos.value || '/var/www/html';
        const tamanhoMaxBody = opcoes.tamanho_max_body.value || '16m';
        const usarSsl = opcoes.ssl.checked;
        const usarHttp2 = usarSsl && opcoes.http2.checked;
        const usarGzip = opcoes.gzip.checked;
        const usarCabecalhosSeguranca = opcoes.cabecalhos_seguranca.checked;
        const usarProxyReverso = opcoes.proxy_reverso.checked;
        const enderecoProxy = opcoes.endereco_proxy.value || 'http://localhost:3000';
        const certificadoSsl = opcoes.certificado_ssl.value || '/etc/letsencrypt/live/exemplo.com.br/fullchain.pem';
        const chaveSsl = opcoes.chave_ssl.value || '/etc/letsencrypt/live/exemplo.com.br/privkey.pem';

        let config = '';

        if (usarSsl) {
            config += `server {
    listen 80;
    server_name ${nomeServidor};
    return 301 https://$host$request_uri;
}

`;
        }

        config += `server {
    listen ${usarSsl ? '443 ssl' : '80'}${usarHttp2 ? ' http2' : ''};
    server_name ${nomeServidor};
    root ${raizDocumentos};
    index index.html index.htm;

    client_max_body_size ${tamanhoMaxBody};
`;

        if (usarSsl) {
            config += `
    # Configuração SSL
    ssl_certificate ${certificadoSsl};
    ssl_certificate_key ${chaveSsl};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
`;
        }

        if (usarGzip) {
            config += `
    # Configuração Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
`;
        }

        if (usarCabecalhosSeguranca) {
            config += `
    # Cabeçalhos de Segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
`;
        }

        if (usarProxyReverso) {
            const usarWebSocketPrincipal = opcoes.suporte_ws_principal && opcoes.suporte_ws_principal.checked;

            config += `
    location / {
        # Configuração do Proxy Reverso
        proxy_pass ${enderecoProxy};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
${usarWebSocketPrincipal ? `
        # Suporte para WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;` : ''}
    }
`;

            proxiesAdicionais.forEach(proxy => {
                const campoLocalizacao = document.getElementById(proxy.locationId);
                const campoUrlProxy = document.getElementById(proxy.proxyId);
                const checkboxWs = document.getElementById(proxy.wsId);

                if (campoLocalizacao && campoUrlProxy) {
                    const localizacao = campoLocalizacao.value;
                    const urlProxy = campoUrlProxy.value;
                    const usarWebSocket = checkboxWs && checkboxWs.checked;

                    config += `
    location ${localizacao} {
        # Configuração de Proxy Adicional
        proxy_pass ${urlProxy};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
${usarWebSocket ? `
        # Suporte para WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;` : ''}
    }
`;
                }
            });

        } else {
            config += `
    location / {
        try_files $uri $uri/ =404;
    }
`;
        }

        config += `}
`;

        opcoes.config_nginx.value = config;
    }

    function alternarVisibilidade() {
        opcoes.container_proxy.style.display = opcoes.proxy_reverso.checked ? 'block' : 'none';

        const sslAtivado = opcoes.ssl.checked;
        opcoes.container_opcoes_ssl.style.display = sslAtivado ? 'block' : 'none';
        opcoes.container_http2.style.display = sslAtivado ? 'flex' : 'none';

        if (!sslAtivado) {
            opcoes.http2.checked = false;
        }

        if (sslAtivado) {
            atualizarCaminhosSSL();
        }
    }

    opcoes.nome_servidor.addEventListener('input', function () {
        if (opcoes.ssl.checked) {
            atualizarCaminhosSSL();
        }
    });

    function criarNovoProxy(index = proxiesAdicionais.length, caminhoLocalizacao = '/api', urlProxy = 'http://localhost:5000') {
        const proxyId = `proxy_${index}`;
        const locationId = `location_${index}`;
        const wsId = `ws_${index}`;

        const divProxy = document.createElement('div');
        divProxy.className = 'proxy-adicional';
        divProxy.setAttribute('data-index', index);

        divProxy.innerHTML = `
            <div class="cabecalho-proxy">
                <h3>Proxy Adicional #${index + 1}</h3>
                <button type="button" class="remover-proxy" data-index="${index}">Remover</button>
            </div>
            <div class="form-group">
                <label for="${locationId}">Localização (location):</label>
                <input type="text" id="${locationId}" value="${caminhoLocalizacao}" class="campo-localizacao">
            </div>
            <div class="form-group">
                <label for="${proxyId}">Endereço do Proxy:</label>
                <input type="text" id="${proxyId}" value="${urlProxy}" class="campo-url-proxy">
            </div>
            <div class="form-group grupo-checkbox">
                <input type="checkbox" id="${wsId}" class="suporte-ws">
                <label for="${wsId}">Suporte para WebSocket</label>
            </div>
        `;

        opcoes.proxies_adicionais.appendChild(divProxy);

        const campoLocalizacao = document.getElementById(locationId);
        const campoUrlProxy = document.getElementById(proxyId);
        const checkboxWs = document.getElementById(wsId);

        campoLocalizacao.addEventListener('input', gerarConfigNginx);
        campoUrlProxy.addEventListener('input', gerarConfigNginx);
        checkboxWs.addEventListener('change', gerarConfigNginx);

        const botaoRemover = divProxy.querySelector('.remover-proxy');
        botaoRemover.addEventListener('click', (e) => {
            const indiceRemover = parseInt(e.target.getAttribute('data-index'));
            removerProxy(indiceRemover);
        });

        proxiesAdicionais.push({
            index,
            locationId,
            proxyId,
            wsId,
            element: divProxy
        });

        gerarConfigNginx();
    }

    function removerProxy(indice) {
        const proxyRemover = proxiesAdicionais.find(p => p.index === indice);
        if (proxyRemover) {
            proxyRemover.element.remove();
            proxiesAdicionais = proxiesAdicionais.filter(p => p.index !== indice);
            gerarConfigNginx();
        }
    }

    inputs.forEach(input => {
        input.addEventListener('input', () => {
            alternarVisibilidade();
            gerarConfigNginx();
        });

        input.addEventListener('change', () => {
            alternarVisibilidade();
            gerarConfigNginx();
        });
    });

    botaoCopiar.addEventListener('click', () => {
        opcoes.config_nginx.select();
        document.execCommand('copy');
        botaoCopiar.textContent = 'Copiado!';
        setTimeout(() => {
            botaoCopiar.textContent = 'Copiar Configuração';
        }, 2000);
    });

    if (opcoes.adicionar_proxy) {
        opcoes.adicionar_proxy.addEventListener('click', () => {
            criarNovoProxy();
        });
    }

    opcoes.copiar_link_simbolico.addEventListener('click', function () {
        const areaTextoTemp = document.createElement('textarea');
        areaTextoTemp.value = opcoes.comando_link_simbolico.textContent;
        document.body.appendChild(areaTextoTemp);
        areaTextoTemp.select();
        document.execCommand('copy');
        document.body.removeChild(areaTextoTemp);

        opcoes.copiar_link_simbolico.textContent = 'Copiado!';
        setTimeout(() => {
            opcoes.copiar_link_simbolico.textContent = 'Copiar Comando';
        }, 2000);
    });

    opcoes.copiar_reiniciar.addEventListener('click', function () {
        const areaTextoTemp = document.createElement('textarea');
        areaTextoTemp.value = 'sudo systemctl restart nginx';
        document.body.appendChild(areaTextoTemp);
        areaTextoTemp.select();
        document.execCommand('copy');
        document.body.removeChild(areaTextoTemp);

        opcoes.copiar_reiniciar.textContent = 'Copiado!';
        setTimeout(() => {
            opcoes.copiar_reiniciar.textContent = 'Copiar Comando';
        }, 2000);
    });

    opcoes.nome_arquivo_conf.addEventListener('input', function () {
        atualizarComandosArquivo();
    });

    opcoes.copiar_comando_nano.addEventListener('click', function () {
        const areaTextoTemp = document.createElement('textarea');
        areaTextoTemp.value = opcoes.comando_nano.textContent;
        document.body.appendChild(areaTextoTemp);
        areaTextoTemp.select();
        document.execCommand('copy');
        document.body.removeChild(areaTextoTemp);

        opcoes.copiar_comando_nano.textContent = 'Copiado!';
        setTimeout(() => {
            opcoes.copiar_comando_nano.textContent = 'Copiar Comando';
        }, 2000);
    });

    atualizarComandosArquivo();
    alternarVisibilidade();
    gerarConfigNginx();
});
