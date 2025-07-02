function downloadAllImages() {
  const images = document.querySelectorAll("img");
  let processedCount = 0;
  let failedCount = 0;

  // Extract file name from URL
  function getFileNameFromUrl() {
    try {
      const url = window.location.href;
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // Remove leading and trailing slashes
      const cleanPath = pathname.replace(/^\/+|\/+$/g, "");

      // Split path into segments
      const segments = cleanPath.split("/");

      // Handle different URL patterns
      if (segments.length >= 3 && segments[0] === "condo") {
        const condoName = segments[1].replace(/-/g, "");
        let roomNumber = segments[segments.length - 1];
        if (roomNumber.startsWith("#")) {
          roomNumber = segments[segments.length - 2];
        }
        return `condo_${condoName}_${roomNumber}`;
      } else {
        // Default fallback
        return "images";
      }
    } catch (error) {
      console.error("Error parsing URL:", error);
      return "images";
    }
  }

  // Show user feedback
  const statusDiv = document.createElement("div");
  statusDiv.style.cssText = `
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
  document.body.appendChild(statusDiv);

  function updateStatus() {
    statusDiv.textContent = `Processing: ${processedCount}/${images.length}, Failed: ${failedCount}`;
  }

  function downloadImage(img, index) {
    return new Promise((resolve) => {
      // Get proper file extension from image source
      const url = img.src;
      const extension = getFileExtension(url) || "jpg";

      // Create filename based on file name and index
      const fileName = getFileNameFromUrl();
      const filename = `${fileName}_${index + 1}.${extension}`;

      // Create canvas to handle CORS issues
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const tempImg = new Image();

      tempImg.crossOrigin = "anonymous";

      tempImg.onload = function () {
        try {
          canvas.width = tempImg.width;
          canvas.height = tempImg.height;
          ctx.drawImage(tempImg, 0, 0);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Download the individual file
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = filename;
                link.style.display = "none";

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Clean up
                URL.revokeObjectURL(url);

                processedCount++;
                updateStatus();
                resolve({ success: true });
              } else {
                failedCount++;
                updateStatus();
                resolve({ success: false });
              }
            },
            "image/jpeg",
            0.9
          );
        } catch (error) {
          console.error("Error processing image:", error);
          failedCount++;
          updateStatus();
          resolve({ success: false });
        }
      };

      tempImg.onerror = function () {
        console.error("Failed to load image:", url);
        failedCount++;
        updateStatus();
        resolve({ success: false });
      };

      tempImg.src = url;
    });
  }

  function getFileExtension(url) {
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
      return match ? match[1].toLowerCase() : null;
    } catch (error) {
      return null;
    }
  }

  // Process all images
  async function processImages() {
    const imagePromises = [];

    // Process all images with a small delay between each download
    for (let i = 0; i < images.length; i++) {
      const promise = new Promise((resolve) => {
        setTimeout(() => {
          downloadImage(images[i], i).then(resolve);
        }, i * 100); // 100ms delay between each download
      });
      imagePromises.push(promise);
    }

    // Wait for all images to be processed
    await Promise.all(imagePromises);

    // Show completion message
    const successCount = processedCount;
    statusDiv.style.background = successCount > 0 ? "#4CAF50" : "#f44336";
    statusDiv.textContent = `Download complete! ${successCount} images downloaded. Failed: ${failedCount}`;

    // Remove status after 5 seconds
    setTimeout(() => {
      if (statusDiv.parentNode) {
        statusDiv.parentNode.removeChild(statusDiv);
      }
    }, 5000);
  }

  if (images.length === 0) {
    statusDiv.textContent = "No images found on this page";
    statusDiv.style.background = "#f44336";
    setTimeout(() => {
      if (statusDiv.parentNode) {
        statusDiv.parentNode.removeChild(statusDiv);
      }
    }, 3000);
    return;
  }

  updateStatus();
  processImages();
}
