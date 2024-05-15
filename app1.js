const video = document.getElementById('video');
const snapButton = document.getElementById('snap');
const endSessionButton = document.getElementById('end-session');
const isbnElem = document.getElementById('isbn');
const titleElem = document.getElementById('title');
const authorsElem = document.getElementById('authors');
const publisherElem = document.getElementById('publisher');
const coverElem = document.getElementById('cover');

let books = {};

// List all video input devices and select the USB camera
navigator.mediaDevices.enumerateDevices()
    .then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const usbCamera = videoDevices.find(device => device.label.includes('USB'));

        if (usbCamera) {
            startCamera(usbCamera.deviceId);
        } else {
            // Eğer USB kamera bulunamazsa varsayılan olarak arka kamerayı kullan
            startCamera();
        }
    })
    .catch(err => {
        console.error('Error enumerating devices: ' + err);
    });

function startCamera(deviceId = null) {
    const constraints = {
        video: {
            facingMode: { exact: "environment" }
        }
    };
    if (deviceId) {
        constraints.video.deviceId = { exact: deviceId };
    }

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            video.srcObject = stream;
            Quagga.init({
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: video,
                    constraints: constraints
                },
                decoder: {
                    readers: ["ean_reader"] // ISBN numaraları genellikle EAN-13 formatındadır
                }
            }, err => {
                if (err) {
                    console.error(err);
                    return;
                }
                Quagga.start();
            });

            Quagga.onDetected(data => {
                const isbn = data.codeResult.code;
                fetchBookData(isbn);
            });
        })
        .catch(err => {
            console.error("Error accessing webcam: " + err);
        });
}

async function fetchBookData(isbn) {
    const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
    const openLibraryUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;

    let bookData = {};

    try {
        const googleBooksResponse = await fetch(googleBooksUrl);
        const googleBooksData = await googleBooksResponse.json();

        if (googleBooksData.totalItems > 0) {
            const book = googleBooksData.items[0].volumeInfo;
            bookData = {
                isbn: isbn,
                title: book.title,
                authors: book.authors.join(', '),
                publisher: book.publisher,
                cover: book.imageLinks?.thumbnail || ""
            };
        } else {
            const openLibraryResponse = await fetch(openLibraryUrl);
            const openLibraryData = await openLibraryResponse.json();
            const book = openLibraryData[`ISBN:${isbn}`];

            if (book) {
                bookData = {
                    isbn: isbn,
                    title: book.title,
                    authors: book.authors.map(author => author.name).join(', '),
                    publisher: book.publishers.map(publisher => publisher.name).join(', '),
                    cover: book.cover?.medium || ""
                };
            }
        }
    } catch (error) {
        console.error('Error fetching book data: ', error);
    }

    if (bookData.title) {
        displayBookData(bookData);
        if (books[isbn]) {
            books[isbn].count += 1;
        } else {
            books[isbn] = { ...bookData, count: 1 };
        }
    } else {
        alert("Book not found.");
    }
}

function displayBookData(bookData) {
    isbnElem.textContent = `ISBN: ${bookData.isbn}`;
    titleElem.textContent = `Title: ${bookData.title}`;
    authorsElem.textContent = `Authors: ${bookData.authors}`;
    publisherElem.textContent = `Publisher: ${bookData.publisher}`;
    coverElem.src = bookData.cover;
}

endSessionButton.addEventListener('click', () => {
    const workbook = XLSX.utils.book_new();
    const worksheetData = [["ISBN", "Title", "Authors", "Publisher", "Count"]];
    for (const [isbn, book] of Object.entries(books)) {
        worksheetData.push([isbn, book.title, book.authors, book.publisher, book.count]);
    }
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Books");
    XLSX.writeFile(workbook, "books.xlsx");

    // Reset for a new session
    books = {};
    alert("Session ended and books.xlsx has been saved.");
});
