import { fetchBookData } from './api.js';

const video = document.getElementById('video');
const endSessionButton = document.getElementById('end-session');
const continueButton = document.getElementById('continue');
const isbnElem = document.getElementById('isbn');
const titleElem = document.getElementById('title');
const authorsElem = document.getElementById('authors');
const publisherElem = document.getElementById('publisher');
const coverElem = document.getElementById('cover');

let books = {};
let isProcessing = false;

// List all video input devices and select the USB camera
navigator.mediaDevices.enumerateDevices()
    .then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const rearCamera = videoDevices.find(device => device.label.toLowerCase().includes('back')) || videoDevices[0];

        if (rearCamera) {
            startCamera(rearCamera.deviceId);
        } else {
            console.error('No camera found');
        }
    })
    .catch(err => {
        console.error('Error enumerating devices: ' + err);
    });

function startCamera(deviceId) {
    const constraints = {
        video: {
            deviceId: { exact: deviceId }
        }
    };

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
                    readers: ["ean_reader"],
                    locate: true
                },
                locate: true,
                frequency: 2,
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
    Quagga.stop();

    fetchBookData(isbn)
        .then(bookData => {
            if (books[isbn]) {
                books[isbn].count += 1;
            } else {
                books[isbn] = { ...bookData, count: 1 };
            }
            displayBookData(bookData);
            setTimeout(() => {
                Quagga.start();
                isProcessing = false;
            }, 2000);
        })
        .catch(error => {
            alert("Error: " + error.message);
            showContinueButton();
            isProcessing = false;
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
        worksheetData.push([isbn, book.title, book.authors, book.publisher, book.count]);
    }
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Books");
    XLSX.writeFile(workbook, "books.xlsx");

    books = {};
    alert("Session ended and books.xlsx has been saved.");
});
