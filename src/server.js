import express from 'express';
import simpleGit from 'simple-git';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize git with explicit path
const git = simpleGit('/Users/glebp/projects/ai-mcp-server-git-commit');

// Log the git status on startup
git.status()
    .then(status => console.log('Git repository status:', status))
    .catch(err => console.error('Git error:', err));

app.use(express.json());

// Get commit history with team analysis
app.get('/api/team-activity', async (req, res) => {
    try {
        // Verify git repository
        const isRepo = await git.checkIsRepo();
        if (!isRepo) {
            console.error('Not a git repository');
            return res.status(400).json({ error: 'Not a git repository' });
        }

        const days = parseInt(req.query.days) || 30;
        const since = new Date();
        since.setDate(since.getDate() - days);

        console.log(`Analyzing git history from ${since.toISOString()}`);
        console.log(`Git working directory: ${projectRoot}`);

        const log = await git.log({
            since: since.toISOString(),
            '--no-merges': null,
        });

        if (!log || !log.all || log.all.length === 0) {
            console.log('No commits found in the specified time range');
            return res.json({
                period: {
                    start: since.toISOString(),
                    end: new Date().toISOString()
                },
                teamActivity: []
            });
        }

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
