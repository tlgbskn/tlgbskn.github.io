document.addEventListener('DOMContentLoaded', function () {
    let bookList = [];

    function startScanner() {
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#interactive'),
                constraints: {
                    facingMode: "environment"
                }
            },
            decoder: {
                readers: ["ean_reader"]
            },
            locate: true
        }, function (err) {
            if (err) {
                console.error(err);
                return;
            }
            console.log("Initialization finished. Ready to start");
            Quagga.start();
        });
    }

    Quagga.onDetected(function (result) {
        let isbn = result.codeResult.code;
        fetchBookInfo(isbn);
        Quagga.stop();
    });

    function fetchBookInfo(isbn) {
        // Google Books API ile kitap bilgilerini alma
        fetch('https://www.googleapis.com/books/v1/volumes?q=isbn:' + isbn)
            .then(response => response.json())
            .then(data => {
                if (data.items && data.items.length > 0) {
                    let bookInfo = {
                        isbn: isbn,
                        title: data.items[0].volumeInfo.title
                    };
                    bookList.push(bookInfo);
                    displayResults(bookInfo);
                } else {
                    // Google Books API'ında kitap bulunamazsa, Open Library API'ına istek gönderme
                    fetchOpenLibrary(isbn);
                }
            })
            .catch(error => {
                console.error('Hata:', error);
                startScanner();
            });
    }
    
    function fetchOpenLibrary(isbn) {
        // Open Library API ile kitap bilgilerini alma
        fetch('https://openlibrary.org/api/books?bibkeys=ISBN:' + isbn + '&format=json&jscmd=data')
            .then(response => response.json())
            .then(data => {
                let bookInfo = data['ISBN:' + isbn];
                if (bookInfo) {
                    bookInfo = {
                        isbn: isbn,
                        title: bookInfo.title
                    };
                    bookList.push(bookInfo);
                    displayResults(bookInfo);
                } else {
                    // Kitap bulunamadı uyarısı gösterme
                    alert("Kitap bulunamadı.");
                    startScanner();
                }
            })
            .catch(error => {
                console.error('Hata:', error);
                startScanner();
            });
    }
    
    

    function displayResults(bookInfo) {
        let resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = 'Detected ISBN: ' + bookInfo.isbn + '<br>' +
            'Kitap İsmi: ' + bookInfo.title + '<br>' +
            'Başarılı! Yeni bir okuma yapmak ister misiniz? <button onclick="continueReading()">Devam</button> <button onclick="saveAndExit()">Sonlandır</button>';
    }

    window.continueReading = function () {
        startScanner();
    };

    window.saveAndExit = function () {
        let wb = XLSX.utils.book_new();
        let wsData = [["ISBN", "Kitap İsmi"]];
        bookList.forEach(book => {
            wsData.push([book.isbn, book.title]);
        });
        let ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "ISBNs");
        XLSX.writeFile(wb, "ISBN_List.xlsx");
    };

    startScanner();
});
