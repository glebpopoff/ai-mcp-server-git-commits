import express from 'express';
import simpleGit from 'simple-git';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const git = simpleGit();

app.use(express.json());

// Get commit history with team analysis
app.get('/api/team-activity', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const since = new Date();
        since.setDate(since.getDate() - days);

        const log = await git.log({
            since: since.toISOString(),
            '--no-merges': null,
        });

        // Analyze commits by author
        const teamActivity = {};
        log.all.forEach(commit => {
            const author = commit.author_email;
            if (!teamActivity[author]) {
                teamActivity[author] = {
                    commits: 0,
                    lastCommit: null,
                    firstCommit: null,
                    files: new Set()
                };
            }
            
            teamActivity[author].commits++;
            teamActivity[author].lastCommit = teamActivity[author].lastCommit || commit.date;
            teamActivity[author].firstCommit = commit.date;
        });

        // Format response
        const response = Object.entries(teamActivity).map(([email, data]) => ({
            email,
            totalCommits: data.commits,
            firstCommit: data.firstCommit,
            lastCommit: data.lastCommit
        }));

        res.json({
            period: {
                start: since.toISOString(),
                end: new Date().toISOString()
            },
            teamActivity: response
        });
    } catch (error) {
        console.error('Error analyzing git history:', error);
        res.status(500).json({ error: 'Failed to analyze git history' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

app.listen(port, () => {
    console.log(`MCP Git Team Analysis server listening on port ${port}`);
});
