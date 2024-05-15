export async function fetchBookData(isbn) {
    const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;

    try {
        const response = await fetch(googleBooksUrl);
        const data = await response.json();

        if (data.totalItems > 0) {
            const book = data.items[0].volumeInfo;
            return {
                isbn: isbn,
                title: book.title || 'N/A',
                authors: book.authors ? book.authors.join(', ') : 'N/A',
                publisher: book.publisher || 'N/A',
                cover: book.imageLinks?.thumbnail || ""
            };
        } else {
            throw new Error('Book not found');
        }
    } catch (error) {
        console.error('Error fetching book data: ', error);
        throw error;
    }
}
