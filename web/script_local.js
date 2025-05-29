document.addEventListener('DOMContentLoaded', function() {
    // 🔧 CONFIGURACIÓN LOCAL - Cambiar esta URL por tu servidor local
    const API_BASE_URL = 'http://localhost:5000';
    
    // Elements
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const fileInfoContainer = document.getElementById('fileInfoContainer');
    const selectedFileName = document.getElementById('selectedFileName');
    const selectedFileSize = document.getElementById('selectedFileSize');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressPercentage = document.getElementById('progressPercentage');
    const progressBar = document.getElementById('progressBar');
    const resultsSection = document.getElementById('resultsSection');
    const customizeToggle = document.getElementById('customizeToggle');
    const customNameContainer = document.getElementById('customNameContainer');
    const customName = document.getElementById('customName');
    const processBtn = document.getElementById('processBtn');
    const qrFileName = document.getElementById('qrFileName');
    const qrFileSize = document.getElementById('qrFileSize');
    const generationDate = document.getElementById('generationDate');
    
    // Set current date
    const today = new Date();
    if (generationDate) {
        generationDate.textContent = today.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    }
    
    // Format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Drag Drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(function(eventName) {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(function(eventName) {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('drag-active');
    }
    
    function unhighlight() {
        dropArea.classList.remove('drag-active');
    }
    
    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf') {
                // Set the file to the input
                fileInput.files = dt.files;
                handleFileSelect(file);
            } else {
                alert('Por favor, sube solo archivos PDF.');
            }
        }
    }
    
    // Listen for file input changes
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            const file = this.files[0];
            if (file.type === 'application/pdf') {
                handleFileSelect(file);
            } else {
                alert('Por favor, sube solo archivos PDF.');
                this.value = ''; // Clear the input
            }
        }
    });
    
    // Handle file selection
    function handleFileSelect(file) {
        // Display file info
        selectedFileName.textContent = file.name;
        selectedFileSize.textContent = 'Tamaño: ' + formatFileSize(file.size);
        fileInfoContainer.style.display = 'block';
        
        // Update QR file info
        qrFileName.textContent = file.name.replace('.pdf', '.png');
        qrFileSize.textContent = formatFileSize(file.size);
        
        // Hide drop area
        dropArea.style.display = 'none';
        
        // Enable process button
        processBtn.disabled = false;
    }
    
    // Función para procesar la respuesta de la API
    function procesarRespuestaAPI(datos) {
        if (!datos || !datos.success) {
            alert('Error al procesar el documento: ' + (datos.error || 'Error desconocido'));
            return;
        }
        
        console.log('✅ Documento procesado con éxito. ID:', datos.id_documento);
        
        // Actualizar la información en la sección de resultados
        document.getElementById('qrFileName').textContent = datos.qr_personalizado ? 
            customName.value + '.png' : 
            selectedFileName.textContent.replace('.pdf', '.png');
        
        // Modificar la imagen del QR para mostrar el actual
        const qrImageContainer = document.querySelector('.qr-code');
        qrImageContainer.innerHTML = ''; // Limpiar el contenedor
        
        // Crear una imagen para mostrar el QR
        const qrImg = document.createElement('img');
        // 🔧 CAMBIO: URL local en lugar de menuidac.com
        qrImg.src = API_BASE_URL + datos.qr_png_url;
        qrImg.alt = 'Código QR generado';
        qrImg.style.width = '200px';
        qrImg.style.height = '200px';
        qrImg.style.border = '1px solid #e5e7eb';
        qrImg.style.borderRadius = '8px';
        qrImageContainer.appendChild(qrImg);
        
        // Configurar el botón de descarga
        const downloadBtn = document.getElementById('downloadBtn');
        downloadBtn.onclick = function(event) {
            // Prevenir el comportamiento predeterminado
            event.preventDefault();
            
            // 🔧 CAMBIO: URL local para descarga
            const downloadUrl = API_BASE_URL + datos.qr_png_url;
            
            // Crear un enlace invisible
            const downloadLink = document.createElement('a');
            downloadLink.href = downloadUrl;
            downloadLink.download = qrFileName.textContent; // Usar el nombre que se muestra en la UI
            downloadLink.style.display = 'none';
            
            // Añadir a la página, hacer clic y luego eliminar
            document.body.appendChild(downloadLink);
            downloadLink.click();
            setTimeout(function() {
                document.body.removeChild(downloadLink);
            }, 100);
            
            console.log('📥 Descargando QR desde:', downloadUrl);
            return false;
        };
        
        // Actualizar la fecha de generación
        const today = new Date();
        document.getElementById('generationDate').textContent = today.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
        
        // Mostrar la sección de resultados
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Función para enviar un PDF a la API y generar QR (compatible con navegadores antiguos)
    function enviarPdfYGenerarQR(archivoPdf, nombrePersonalizado = null) {
        // Mostrar indicador de carga
        progressContainer.style.display = 'block';
        
        // Preparar los datos del formulario
        const formData = new FormData();
        formData.append('carta', archivoPdf);
        
        // Si hay nombre personalizado, añadirlo
        if (nombrePersonalizado) {
            formData.append('nombre_qr_personalizado', nombrePersonalizado);
        }
        
        // Simular progreso para mejorar la experiencia del usuario
        let progreso = 0;
        const intervaloProgreso = setInterval(function() {
            progreso += 5;
            progressPercentage.textContent = progreso + '%';
            progressBar.style.width = progreso + '%';
            
            if (progreso >= 90) {
                clearInterval(intervaloProgreso);
            }
        }, 150);
        
        // Crear una instancia de XMLHttpRequest
        const xhr = new XMLHttpRequest();
        
        // 🔧 CAMBIO: URL local de la API
        const apiUrl = API_BASE_URL + '/api/procesar';
        console.log('📤 Enviando PDF a:', apiUrl);
        
        // Configurar la solicitud
        xhr.open('POST', apiUrl, true);
        
        // Configurar el manejo de la respuesta
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    // Completar el progreso al 100%
                    progressPercentage.textContent = '100%';
                    progressBar.style.width = '100%';
                    
                    // Procesar la respuesta exitosa
                    try {
                        const datos = JSON.parse(xhr.responseText);
                        console.log('✅ Respuesta de la API:', datos);
                        setTimeout(function() {
                            progressContainer.style.display = 'none';
                            procesarRespuestaAPI(datos);
                        }, 500);
                    } catch (error) {
                        clearInterval(intervaloProgreso);
                        progressContainer.style.display = 'none';
                        alert('❌ Error al procesar la respuesta: ' + error.message);
                        console.error('Error al parsear la respuesta:', error);
                    }
                } else {
                    clearInterval(intervaloProgreso);
                    progressContainer.style.display = 'none';
                    
                    // Mostrar mensaje de error más detallado
                    let mensajeError = 'Error en la respuesta de la API: ' + xhr.status;
                    if (xhr.status === 0) {
                        mensajeError = '❌ No se pudo conectar con la API local. ¿Está ejecutándose en http://localhost:5000?';
                    } else if (xhr.status >= 500) {
                        mensajeError = '❌ Error interno del servidor. Revisa los logs de la API.';
                    }
                    
                    alert(mensajeError);
                    console.error('Error en la respuesta:', xhr.status, xhr.statusText, xhr.responseText);
                }
            }
        };
        
        // Manejar errores de red
        xhr.onerror = function() {
            clearInterval(intervaloProgreso);
            progressContainer.style.display = 'none';
            alert('❌ Error de red al conectar con la API local. Verifica que la API esté ejecutándose en ' + API_BASE_URL);
            console.error('Error de red al conectar con:', apiUrl);
        };
        
        // Enviar la solicitud
        xhr.send(formData);
    }
    
    // Remove selected file
    removeFileBtn.addEventListener('click', function() {
        fileInput.value = ''; // Clear the input
        fileInfoContainer.style.display = 'none';
        dropArea.style.display = 'block';
        processBtn.disabled = true;
    });
    
    // Toggle customization
    customizeToggle.addEventListener('change', function() {
        if (this.checked) {
            customNameContainer.style.display = 'block';
        } else {
            customNameContainer.style.display = 'none';
        }
    });
    
    // Update QR file name when custom name changes
    if (customName) {
        customName.addEventListener('input', function() {
            if (this.value) {
                qrFileName.textContent = this.value + '.png';
            } else {
                // Restore original filename but with .png extension
                const originalName = selectedFileName.textContent;
                const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
                qrFileName.textContent = baseName + '.png';
            }
        });
    }
    
    // Process button click
    processBtn.addEventListener('click', function() {
        if (!fileInput.files || fileInput.files.length === 0) {
            alert('Por favor, selecciona un archivo PDF antes de continuar.');
            return;
        }
        
        // Verificar que el archivo sea un PDF
        const archivoPdf = fileInput.files[0];
        if (archivoPdf.type !== 'application/pdf') {
            alert('El archivo seleccionado no es un PDF. Por favor, selecciona un archivo PDF válido.');
            return;
        }
        
        // 🔧 CAMBIO: Aumento el límite a 16MB para coincidir con la API
        const maxTamano = 16 * 1024 * 1024; // 16MB en bytes
        if (archivoPdf.size > maxTamano) {
            alert('El archivo excede el tamaño máximo permitido de 16MB. Por favor, selecciona un archivo más pequeño.');
            return;
        }
        
        // Obtener nombre personalizado si el toggle está activado
        let nombrePersonalizado = null;
        if (customizeToggle.checked && customName.value.trim() !== '') {
            nombrePersonalizado = customName.value.trim();
        }
        
        console.log('🚀 Iniciando procesamiento del PDF...');
        if (nombrePersonalizado) {
            console.log('🎯 Nombre personalizado:', nombrePersonalizado);
        }
        
        // Enviar el archivo a la API
        enviarPdfYGenerarQR(archivoPdf, nombrePersonalizado);
    });
    
    // 🔧 FUNCIÓN ADICIONAL: Verificar conexión con la API al cargar la página
    function verificarConexionAPI() {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', API_BASE_URL + '/api/health', true);
        xhr.timeout = 5000; // 5 segundos de timeout
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log('✅ Conexión con la API local establecida correctamente');
                    try {
                        const datos = JSON.parse(xhr.responseText);
                        console.log('📊 Estado de la API:', datos);
                    } catch (e) {
                        console.log('✅ API respondió correctamente');
                    }
                } else {
                    console.warn('⚠️ La API local no está respondiendo. Status:', xhr.status);
                }
            }
        };
        
        xhr.onerror = function() {
            console.warn('⚠️ No se pudo conectar con la API local en ' + API_BASE_URL);
            console.warn('   Asegúrate de que la API esté ejecutándose con: python API_local.py');
        };
        
        xhr.send();
    }
    
    // Verificar conexión al cargar
    verificarConexionAPI();
});