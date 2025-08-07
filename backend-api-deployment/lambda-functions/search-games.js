exports.handler = async (event) => {
    console.log('Search games request:', event);
    
    // Import AWS SDK v3 modules
    const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
    const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");
    
    const GAMES_TABLE = process.env.GAMES_TABLE || 'trioll-prod-games';
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    try {
        // Get search query from query parameters
        const queryParams = event.queryStringParameters || {};
        const searchQuery = (queryParams.q || queryParams.query || '').toLowerCase().trim();
        const limit = parseInt(queryParams.limit) || 20;
        
        console.log('Search query:', searchQuery);
        
        // Create DynamoDB client
        const client = new DynamoDBClient({ region: 'us-east-1' });
        const docClient = DynamoDBDocumentClient.from(client);
        
        // Scan all games (in production, you'd use a search index)
        const command = new ScanCommand({
            TableName: GAMES_TABLE
        });
        
        const result = await docClient.send(command);
        console.log(`Scanning ${result.Items.length} games for query: "${searchQuery}"`);
        
        // Filter games based on search query
        let filteredGames = result.Items;
        
        if (searchQuery) {
            filteredGames = result.Items.filter(game => {
                const title = (game.title || '').toLowerCase();
                const description = (game.description || '').toLowerCase();
                const developer = (game.developer || game.developerName || '').toLowerCase();
                const category = (game.category || '').toLowerCase();
                const tags = (game.tags || []).map(t => t.toLowerCase()).join(' ');
                
                return title.includes(searchQuery) ||
                       description.includes(searchQuery) ||
                       developer.includes(searchQuery) ||
                       category.includes(searchQuery) ||
                       tags.includes(searchQuery);
            });
        }
        
        // Sort by relevance (title matches first)
        if (searchQuery) {
            filteredGames.sort((a, b) => {
                const aTitle = (a.title || '').toLowerCase();
                const bTitle = (b.title || '').toLowerCase();
                
                // Exact matches first
                if (aTitle === searchQuery && bTitle !== searchQuery) return -1;
                if (bTitle === searchQuery && aTitle !== searchQuery) return 1;
                
                // Then starts with
                if (aTitle.startsWith(searchQuery) && !bTitle.startsWith(searchQuery)) return -1;
                if (bTitle.startsWith(searchQuery) && !aTitle.startsWith(searchQuery)) return 1;
                
                // Then by rating
                return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
            });
        }
        
        // Limit results
        const limitedGames = filteredGames.slice(0, limit);
        
        // Transform to match expected format
        const transformedGames = limitedGames.map(game => ({
            gameId: game.gameId || game.id,
            id: game.gameId || game.id,
            title: game.title || 'Untitled',
            description: game.description || '',
            category: game.category || 'Uncategorized',
            categories: game.categories || [game.category],
            gameUrl: game.downloadUrl || game.gameUrl || '',
            downloadUrl: game.downloadUrl || game.gameUrl || '',
            thumbnailUrl: game.image || game.thumbnailUrl || '',
            image: game.image || game.thumbnailUrl || '',
            developer: game.developer || game.developerName || 'Trioll Games',
            likeCount: parseInt(game.likeCount || 0),
            playCount: String(game.playCount || '0'),
            totalPlayCount: String(game.totalPlayCount || game.playCount || '0'),
            rating: parseFloat(game.rating || 0),
            averageRating: parseFloat(game.averageRating || game.rating || 0),
            ratingCount: parseInt(game.ratingCount || 0),
            size: game.size || '100 MB',
            ageRating: game.ageRating || 'Everyone',
            releaseDate: game.releaseDate || game.createdAt,
            price: game.price || 'Free',
            gameType: game.gameType || 'html5',
            version: game.version || '1.0.0',
            createdAt: game.createdAt || new Date().toISOString()
        }));
        
        // Generate search suggestions
        const suggestions = [];
        if (searchQuery) {
            // Add category suggestions
            const categories = [...new Set(result.Items.map(g => g.category).filter(Boolean))];
            suggestions.push(...categories.filter(c => c.toLowerCase().includes(searchQuery)).slice(0, 3));
            
            // Add popular searches
            if (searchQuery.length >= 2) {
                suggestions.push(
                    searchQuery + ' multiplayer',
                    searchQuery + ' offline',
                    'best ' + searchQuery + ' games'
                );
            }
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                query: searchQuery || '',
                filters: {
                    tags: []
                },
                sort: {
                    by: 'relevance',
                    order: 'desc'
                },
                results: transformedGames,
                pagination: {
                    offset: 0,
                    limit: limit,
                    total: filteredGames.length,
                    hasMore: filteredGames.length > limit
                },
                facets: {
                    categories: [
                        { name: 'action', count: result.Items.filter(g => g.category === 'Action').length },
                        { name: 'puzzle', count: result.Items.filter(g => g.category === 'Puzzle').length },
                        { name: 'adventure', count: result.Items.filter(g => g.category === 'Adventure').length },
                        { name: 'racing', count: result.Items.filter(g => g.category === 'Racing').length },
                        { name: 'strategy', count: result.Items.filter(g => g.category === 'Strategy').length },
                        { name: 'simulation', count: result.Items.filter(g => g.category === 'Simulation').length }
                    ],
                    tags: []
                },
                suggestions: [...new Set(suggestions)].slice(0, 5)
            })
        };
        
    } catch (error) {
        console.error('Search error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Search failed',
                message: error.message
            })
        };
    }
};