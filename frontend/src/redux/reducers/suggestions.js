export default function handler(req, res) {
    const suggestions = [
        { id: 1, title: "Appartement moderne à Paris", location: "Paris, France", price: 120 },
        { id: 2, title: "Villa avec piscine à Marrakech", location: "Marrakech, Maroc", price: 250 },
        { id: 3, title: "Studio cosy à New York", location: "New York, USA", price: 150 },
    ];
    
    res.status(200).json(suggestions);
}
