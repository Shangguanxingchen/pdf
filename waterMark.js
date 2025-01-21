import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from "@pdf-lib/fontkit";
/**
 * 浏览器打开新页签预览pdf
 * blob（必选）: pdf文件信息（Blob对象）【Blob】
 * docTitle（可选）: 浏览器打开新页签的title  【String】
 * isAddWatermark（可选，默认为false）: 是否需要添加水印 【Boolean】
 * watermark（必选）：水印信息 【Object: { type: string, text: string, image:{ bytes: ArrayBuffer, imageType: string } }】
 * watermark.type（可选）：类型 可选值：text、image、canvas
 * watermark.text（watermark.type为image时不填，否则必填）：水印文本。注意：如果watermark.type值为text，text取值仅支持拉丁字母中的218个字符。详见：https://www.npmjs.com/package/pdf-lib
 * watermark.image（watermark.type为image时必填，否则不填）：水印图片
 * watermark.image.bytes：图片ArrayBuffer
 * watermark.image.imageType：图片类型。可选值：png、jpg
 * Edit By WFT
 */
export default class PreviewPdf {
  constructor({ urlPdf ,blob, docTitle, isAddWatermark = false, watermark: { type = 'text', text = 'huaxia', image } }) {
    const _self = this
    if(!blob) {
      return console.error('[PDF Blob Is a required parameter]')
    }
    if(!isAddWatermark) { // 不添加水印
      _self.preView(urlPdf ,blob, docTitle)
    } else {
      let bytes,imageType
      if(type == 'image') {
        if(!image) {
          return console.error('["image" Is a required parameter]')
        }
        bytes = image.bytes
        imageType = image.imageType
      }
      const map = {
        'text': _self.addTextWatermark.bind(_self),
        'image': _self.addImageWatermark.bind(_self),
        'canvas': _self.addCanvasWatermark.bind(_self)
      }
      blob.arrayBuffer().then(async buffer => {
        const existingPdfBytes = buffer
        // const pdfDoc = await PDFDocument.load(existingPdfBytes)
        const pdfDoc = await PDFDocument.load(existingPdfBytes).then(doc => {
          doc.setTitle(docTitle);
          return doc
        })
        let params
        if(type == 'text') params = { pdfDoc, text, docTitle }
        if(type == 'image') params = { pdfDoc, bytes, imageType, docTitle }
        if(type == 'canvas') params = { pdfDoc, text, docTitle }
        map[type](params)
      }).catch(e => console.error('[Preview Pdf Error]:', e))
    }
  }
  // 添加 Text 水印
  async addTextWatermark({ pdfDoc, text, docTitle }) {
    // const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const url = '/pdfview/static/font.ttf';
    // const url = '/static/font.ttf';
    const fontBytes = await fetch(url).then((res) => res.arrayBuffer());
    // 自定义字体挂载
    pdfDoc.registerFontkit(fontkit)
    const customFont = await pdfDoc.embedFont(fontBytes)

    const pages = pdfDoc.getPages()
    for(let i = 0; i < pages.length; i++) {
      let page = pages[i]
      let { width, height } = page.getSize()
      for(let i = 0; i < 3; i++) {
        for(let j = 0; j < 3; j++) {
          page.drawText(text, {
            x: j * 200 + 30,
            y: height / 6 + i * 250,
            size: 16,
            font: customFont,
            color: rgb(0.5, 0.5, 0.5),
            opacity: 0.2,
            rotate: degrees(-35),
          })
        }
      }
    }
    // 序列化为字节Unit8Array
    const pdfBytes = await pdfDoc.save()
    this.preView(pdfBytes, docTitle)
  }
 
  // 添加 image 水印
  async addImageWatermark({ pdfDoc, bytes, imageType, docTitle }) {
    // 嵌入JPG图像字节和PNG图像字节
    let image
    const maps = {
      'jpg': pdfDoc.embedJpg.bind(pdfDoc),
      'png': pdfDoc.embedPng.bind(pdfDoc)
    }
    image = await maps[imageType](bytes)
    // 将JPG图像的宽度/高度缩小到原始大小的50%
    const dims = image.scale(0.5)
    const pages = pdfDoc.getPages()
    for(let i = 0; i < pages.length; i++) {
      let page = pages[i]
      let { width, height } = page.getSize()
      for(let i = 0; i < 6; i++) {
        for(let j = 0; j < 6; j++) {
          page.drawImage(image, {
            x: width / 5 - dims.width / 2 + j * 100,
            y: height / 5 - dims.height / 2 + i * 100,
            width: dims.width,
            height: dims.height,
            rotate: degrees(-35)
          })
        }
      }
    }
    // 序列化为字节
    const pdfBytes = await pdfDoc.save()
    this.preView(pdfBytes, docTitle)
  }
 
  // 添加 canvas 水印
  addCanvasWatermark({ pdfDoc, text, docTitle }) {
    // 旋转角度大小
    const rotateAngle = Math.PI / 6;
 
    // labels是要显示的水印文字，垂直排列
    let labels = new Array();
    labels.push(text);
 
    const pages = pdfDoc.getPages()
 
    const size = pages[0].getSize()
 
    let pageWidth = size.width
    let pageHeight = size.height
 
    let canvas = document.createElement('canvas');
    let canvasWidth = canvas.width = pageWidth;
    let canvasHeight = canvas.height = pageHeight;
 
    const context = canvas.getContext('2d');
    context.font = "15px Arial";
 
    // 先平移到画布中心
    context.translate(pageWidth / 2, pageHeight / 2 - 250);
    // 在绕画布逆方向旋转30度
    context.rotate(-rotateAngle);
    // 在还原画布的坐标中心
    context.translate(-pageWidth / 2, -pageHeight / 2);
 
    // 获取文本的最大长度
    let textWidth = Math.max(...labels.map(item => context.measureText(item).width));
 
    let lineHeight = 15, fontHeight = 12, positionY, i
    i = 0, positionY = 0
    while (positionY <= pageHeight) {
      positionY = positionY + lineHeight * 5
      i++
    }
    canvasWidth += Math.sin(rotateAngle) * (positionY + i * fontHeight) // 给canvas加上画布向左偏移的最大距离
    canvasHeight = 2 * canvasHeight
    for (positionY = 0, i = 0; positionY <= canvasHeight; positionY = positionY + lineHeight * 5) {
      // 进行画布偏移是为了让画布旋转之后水印能够左对齐;
      context.translate(-(Math.sin(rotateAngle) * (positionY + i * fontHeight)), 0);
      for (let positionX = 0; positionX < canvasWidth; positionX += 2 * textWidth) {
        let spacing = 0;
        labels.forEach(item => {
          context.fillText(item, positionX, positionY + spacing);        
          context.fillStyle = 'rgba(187, 187, 187, .8)'; // 字体颜色
          spacing = spacing + lineHeight;
        })
      }
      context.translate(Math.sin(rotateAngle) * (positionY + i * fontHeight), 0);
      context.restore();
      i++
    }
    // 图片的base64编码路径
    let dataUrl = canvas.toDataURL('image/png');
    Image.crossOrigin = 'Anonymous'
    // 使用Xhr请求获取图片Blob
    let xhr = new XMLHttpRequest();
    xhr.open("get", dataUrl, true);
    xhr.responseType = "blob";
    xhr.onload = res => {
      const imgBlob = res.target.response
      // 获取Blob图片Buffer
      imgBlob.arrayBuffer().then(async buffer => {
        const pngImage = await pdfDoc.embedPng(buffer)
        // pngImage.crossOrigin = 'Anonymous'
        for(let i = 0; i < pages.length; i++) {
          pages[i].drawImage(pngImage)
        }
        // 序列化为字节
        const pdfBytes = await pdfDoc.save()
        this.preView(pdfBytes, docTitle)
      })
    }
    xhr.send();
  }
  // 预览
  preView(urlPdf, stream, docTitle) {
    const URL = window.URL || window.webkitURL;
    const href = URL.createObjectURL(new Blob([stream], { type: 'application/pdf;charset=utf-8' }))
    window.location.replace(urlPdf)
    // const userAgent = navigator.userAgent;
    // // 检测是否在 Android 上
    // const isAndroid = /Android/.test(userAgent);
    // if (isAndroid) {
    //   console.log('这是 Android 设备');
      // const xhr = new XMLHttpRequest();
      // xhr.open('POST', '/uploadPDF', true); // 这里假设有一个上传文件的服务器端点
      // xhr.setRequestHeader('Content-Type', 'application/pdf');

      // xhr.onreadystatechange = function() {
      //   if (xhr.readyState === XMLHttpRequest.DONE) {
      //     if (xhr.status === 200) {
      //       // 服务器成功保存文件后，返回文件的公开可访问链接
      //       const fileURL = xhr.responseText; // 假设服务器返回文件链接
      //       console.log('PDF 文件链接：', fileURL);
      //       // 现在你可以在浏览器中使用该链接
      //     } else {
      //       console.error('上传文件时出错');
      //     }
      //   }
      // };

      // // 发送 PDF 数据到服务器
      // xhr.send(stream);
    // } else {
    //   window.location.replace(href)
    // }
    // window.location.replace(href)
    // const wo = window.open(href, "_self")
    // 设置新打开的页签 document title
    // let timer = setInterval(() => {
    //   if(wo.closed) {
    //     clearInterval(timer)
    //   } else {
    //     wo.document.title = docTitle
    //   }
    // }, 0)
    // 获取blob类型的PDF文件
    // var blob = new Blob([pdfData], { type: 'application/pdf' });

    // 将blob类型的PDF文件转换为base64编码
    // var reader = new FileReader();
    // reader.readAsDataURL(href);
    // reader.onloadend = function() {
    //   var base64Data = reader.result;
    // 将base64编码的PDF文件嵌入到HTML页面中进行显示
    // var iframe = document.createElement('iframe');
    // iframe.style.width = "100%"
    // iframe.style.height = "100%"
    // iframe.style.border = "none"
    // iframe.src = href;
    // document.querySelector('#pdf-view').appendChild(iframe);
    // document.body.appendChild(iframe);
  }
}
