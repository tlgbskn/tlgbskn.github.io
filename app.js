import { fetchBookData } from './api.js';

const video = document.getElementById('video');
const snapButton = document.getElementById('snap');
const endSessionButton = document.getElementById('end-session');
const continueButton = document.getElementById('continue');
const isbnElem = document.getElementById('isbn');
const titleElem = document.getElementById('title');
const authorsElem = document.getElementById('authors');
const publisherElem = document.getElementById('publisher');
const coverElem = document.getElementById('cover');

let books = {};
let isProcessing = false;
let videoDevices = [];

// List all video input devices and let the user select the rear camera
navigator.mediaDevices.enumerateDevices()
    .then(devices => {
        videoDevices = devices.filter(device => device.kind === 'videoinput');
        if (videoDevices.length > 1) {
            startCamera(videoDevices[0].deviceId);  // Usually the second camera is the rear one
        } else {
            startCamera(videoDevices[1].deviceId);  // Use the only available camera
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
                    readers: ["ean_reader"], // ISBN numaraları genellikle EAN-13 formatındadır
                    locate: true
                },
                locate: true,
                frequency: 2, // Algılama frekansı (ms cinsinden)
            }, err => {
                if (err) {
                    console.error(err);
                    return;
                }
                Quagga.start();
            });

            Quagga.onDetected(onDetectedHandler);
        })
        .catch(err => {
            console.error("Error accessing webcam: " + err);
        });
}

function onDetectedHandler(data) {
    if (isProcessing) return;

    const isbn = data.codeResult.code;
    isProcessing = true;

    if (books[isbn]) {
        displayBookData(books[isbn]);
        isProcessing = false;
        return;
    }

    fetchBookData(isbn)
        .then(bookData => {
            books[isbn] = bookData;
            displayBookData(bookData);
            isProcessing = false;
            Quagga.start();
        })
        .catch(error => {
            alert("Error: " + error.message);
            showContinueButton();
        });
}

function showContinueButton() {
    continueButton.style.display = 'block';
}

function hideContinueButton() {
    continueButton.style.display = 'none';
}

function displayBookData(bookData) {
    isbnElem.textContent = `ISBN: ${bookData.isbn}`;
    titleElem.textContent = `Title: ${bookData.title}`;
    authorsElem.textContent = `Authors: ${bookData.authors}`;
    publisherElem.textContent = `Publisher: ${bookData.publisher}`;
    coverElem.src = bookData.cover;
}

continueButton.addEventListener('click', () => {
    hideContinueButton();
    Quagga.start();
    isProcessing = false;
});

endSessionButton.addEventListener('click', () => {
    const workbook = XLSX.utils.book_new();
    const worksheetData = [["ISBN", "Title", "Authors", "Publisher", "Count"]];
    for (const [isbn, book] of Object.entries(books)) {
        worksheetData.push([isbn, book.title, book.authors, book.publisher, 1]);
    }
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Books");
    XLSX.writeFile(workbook, "books.xlsx");

    books = {};
    alert("Session ended and books.xlsx has been saved.");
});
