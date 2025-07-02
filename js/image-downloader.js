/**
 * Image Downloader - Downloads all images from a page with platform-specific handling
 */
class ImageDownloader {
  constructor() {
    this.processedCount = 0;
    this.failedCount = 0;
    this.images = document.querySelectorAll("img");
    this.statusDiv = null;

    this.init();
  }

  /**
   * Initialize the downloader
   */
  init() {
    if (this.images.length === 0) {
      this.showError("No images found on this page");
      return;
    }

    this.createStatusDisplay();
    this.updateStatus();
    this.processImages();
  }

  /**
   * Create and display status indicator
   */
  createStatusDisplay() {
    this.statusDiv = document.createElement("div");
    this.statusDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 300px;
        `;
    document.body.appendChild(this.statusDiv);
  }

  /**
   * Update status display
   */
  updateStatus() {
    if (this.statusDiv) {
      if (this.failedCount > 0) {
        this.statusDiv.textContent = `Processing: ${this.processedCount}/${this.images.length}, Failed: ${this.failedCount}`;
      } else {
        this.statusDiv.textContent = `Processing: ${this.processedCount}/${this.images.length}`;
      }
    }
  }

  /**
   * Show error message
   */
  showError(message, duration = 3000) {
    if (this.statusDiv) {
      this.statusDiv.style.background = "#f44336";
      this.statusDiv.innerHTML = message;
      setTimeout(() => this.removeStatusDisplay(), duration);
    }
  }

  /**
   * Show success message
   */
  showSuccess(message, duration = 5000) {
    if (this.statusDiv) {
      this.statusDiv.style.background = "#4CAF50";
      this.statusDiv.innerHTML = message;
      setTimeout(() => this.removeStatusDisplay(), duration);
    }
  }

  /**
   * Remove status display
   */
  removeStatusDisplay() {
    if (this.statusDiv && this.statusDiv.parentNode) {
      this.statusDiv.parentNode.removeChild(this.statusDiv);
    }
  }

  /**
   * Extract filename from current URL
   */
  getFileNameFromUrl() {
    try {
      const url = window.location.href;
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // Remove leading and trailing slashes
      const cleanPath = pathname.replace(/^\/+|\/+$/g, "");
      const segments = cleanPath.split("/");

      // Handle condo URL patterns
      if (segments.length >= 3 && segments[0] === "condo") {
        const condoName = segments[1].replace(/-/g, "");
        let roomNumber = segments[segments.length - 1];

        if (roomNumber.startsWith("#")) {
          roomNumber = segments[segments.length - 2];
        }

        return `condo_${condoName}_${roomNumber}`;
      }

      return "images";
    } catch (error) {
      console.error("Error parsing URL:", error);
      return "images";
    }
  }

  /**
   * Get file extension from URL
   */
  getFileExtension(url) {
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
      return match ? match[1].toLowerCase() : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Detect platform type
   */
  getPlatform() {
    const userAgent = navigator.userAgent;

    if (/iPad|iPhone|iPod/.test(userAgent)) {
      return "ios";
    } else if (
      /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    ) {
      return "android";
    }

    return "desktop";
  }

  /**
   * Check if Web Share API supports files
   */
  canShareFiles() {
    return (
      navigator.share && navigator.canShare && navigator.canShare({ files: [] })
    );
  }

  /**
   * Download file using Web Share API
   */
  async downloadWithShareAPI(blob, filename, fileName) {
    try {
      const file = new File([blob], filename, { type: "image/jpeg" });
      await navigator.share({
        files: [file],
        title: "Downloaded Image",
        text: `Image from ${fileName}`,
      });
      return true;
    } catch (error) {
      console.error("Share failed, falling back to download:", error);
      return false;
    }
  }

  /**
   * Download file using standard download method
   */
  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /**
   * Process single image
   */
  async processImage(img, index) {
    return new Promise((resolve) => {
      const url = img.src;
      const extension = this.getFileExtension(url) || "jpg";
      const fileName = this.getFileNameFromUrl();
      const filename = `${fileName}_${index + 1}.${extension}`;

      // Create canvas for CORS handling
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const tempImg = new Image();

      tempImg.crossOrigin = "anonymous";

      tempImg.onload = () => {
        try {
          canvas.width = tempImg.width;
          canvas.height = tempImg.height;
          ctx.drawImage(tempImg, 0, 0);

          canvas.toBlob(
            async (blob) => {
              if (blob) {
                await this.handleImageDownload(blob, filename, fileName);
                this.processedCount++;
                this.updateStatus();
                resolve({ success: true });
              } else {
                this.failedCount++;
                this.updateStatus();
                resolve({ success: false });
              }
            },
            "image/jpeg",
            0.9
          );
        } catch (error) {
          console.error("Error processing image:", error);
          this.failedCount++;
          this.updateStatus();
          resolve({ success: false });
        }
      };

      tempImg.onerror = () => {
        console.error("Failed to load image:", url);
        this.failedCount++;
        this.updateStatus();
        resolve({ success: false });
      };

      tempImg.src = url;
    });
  }

  /**
   * Handle image download based on platform
   */
  async handleImageDownload(blob, filename, fileName) {
    const platform = this.getPlatform();

    switch (platform) {
      case "android":
        if (this.canShareFiles()) {
          const shared = await this.downloadWithShareAPI(
            blob,
            filename,
            fileName
          );
          if (!shared) {
            this.downloadFile(blob, filename);
          }
        } else {
          this.downloadFile(blob, filename);
        }
        break;

      default: // desktop and ios
        this.downloadFile(blob, filename);
        break;
    }
  }

  /**
   * Process all images with delay
   */
  async processImages() {
    const imagePromises = [];

    // Process images with delay to prevent overwhelming the browser
    for (let i = 0; i < this.images.length; i++) {
      const promise = new Promise((resolve) => {
        setTimeout(() => {
          this.processImage(this.images[i], i).then(resolve);
        }, i * 200); // 200ms delay between each download
      });
      imagePromises.push(promise);
    }

    // Wait for all images to be processed
    await Promise.all(imagePromises);

    // Show completion message
    const successCount = this.processedCount;
    if (this.failedCount === 0) {
      this.showSuccess(
        `Download complete! <br> ${successCount} images downloaded`
      );
    } else if (this.failedCount > 0) {
      this.showError(
        `Download failed! <br> ${this.failedCount}/${this.images.length} images failed to download`
      );
    }
  }
}

/**
 * Main function to start image download
 */
function downloadAllImages() {
    new ImageDownloader();
}

/**
 * Hide download button on iOS devices
 */
function hideDownloadButtonOnIOS() {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    
    if (isIOS) {
        // Find and hide all download buttons
        const downloadButtons = document.querySelectorAll('[onclick*="downloadAllImages"], button, a');
        
        downloadButtons.forEach(button => {
            // Check if this button calls downloadAllImages
            const onclick = button.getAttribute('onclick') || '';
            const hasDownloadFunction = onclick.includes('downloadAllImages');
            
            if (hasDownloadFunction) {
                button.style.display = 'none';
            }
        });
    }
}

// Auto-hide download button on iOS when page loads
document.addEventListener('DOMContentLoaded', hideDownloadButtonOnIOS);
