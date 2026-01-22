/**
 * API module for backend communication
 */

const API = {
    baseUrl: '/api',

    /**
     * Upload an audio file
     * @param {File} file - The audio file to upload
     * @returns {Promise<Object>} Upload response with file ID
     */
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.baseUrl}/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

        return response.json();
    },

    /**
     * Analyze an uploaded file
     * @param {string} fileId - The file ID from upload
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeFile(fileId) {
        const response = await fetch(`${this.baseUrl}/analyze/${fileId}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Analysis failed');
        }

        return response.json();
    },

    /**
     * Get waveform data for visualization
     * @param {string} fileId - The file ID
     * @param {number} points - Number of data points
     * @returns {Promise<Object>} Waveform data
     */
    async getWaveform(fileId, points = 2000) {
        const response = await fetch(`${this.baseUrl}/waveform/${fileId}?points=${points}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get waveform');
        }

        return response.json();
    },

    /**
     * Update beat positions
     * @param {string} fileId - The file ID
     * @param {Object} beatData - Beat data to update
     * @returns {Promise<Object>} Updated beat data
     */
    async updateBeats(fileId, beatData) {
        const response = await fetch(`${this.baseUrl}/update-beats/${fileId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(beatData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update beats');
        }

        return response.json();
    },

    /**
     * Get click track timing data
     * @param {string} fileId - The file ID
     * @returns {Promise<Object>} Click track data
     */
    async getClickTrack(fileId) {
        const response = await fetch(`${this.baseUrl}/click-track/${fileId}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get click track');
        }

        return response.json();
    },

    /**
     * Export analysis data
     * @param {string} fileId - The file ID
     * @param {string} format - Export format ('json' or 'csv')
     * @returns {Promise<Object|string>} Export data
     */
    async exportData(fileId, format = 'json') {
        const response = await fetch(`${this.baseUrl}/export/${fileId}?format=${format}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Export failed');
        }

        if (format === 'csv') {
            return response.text();
        }

        return response.json();
    },

    /**
     * Delete an uploaded file
     * @param {string} fileId - The file ID
     * @returns {Promise<Object>} Delete response
     */
    async deleteFile(fileId) {
        const response = await fetch(`${this.baseUrl}/delete/${fileId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Delete failed');
        }

        return response.json();
    },

    /**
     * Get file status
     * @param {string} fileId - The file ID
     * @returns {Promise<Object>} Status response
     */
    async getStatus(fileId) {
        const response = await fetch(`${this.baseUrl}/status/${fileId}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Status check failed');
        }

        return response.json();
    }
};
