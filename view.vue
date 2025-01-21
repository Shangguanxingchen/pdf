<template>
  <div v-loading="loading" style="height:100vh" id="pdf-view">
    <iframe :src="src" frameborder="0" width="100%" height="100%" id="pdf-view"></iframe>
  </div>
</template>

<script>

import PreviewPdf from '@/utils/previewPdf'
import { decrypt } from '@/utils/crypto'
import { getPdfAddress,getKeywordFromPid } from '@/api'
export default {
  components: {
  },
  data() {
    return {
      userid: '',
      title: '',
      loading: false,
      src: '',
      keyword: ''
    };
  },
  mounted() {
    // this.init()
    this.initTest()
  },
  methods: {
    init() {
      const url = window.location.href
      const newUrl = new URL(url.replace(/\+/g, '%2B'))
      const pdfFileName = newUrl.searchParams.get('pdf')
      this.userid = decrypt(newUrl.searchParams.get('userid'))
      this.title = newUrl.searchParams.get('title')
      this.keyword = newUrl.searchParams.get('keyword')
      const origin = newUrl.origin

      let params = {
        pdf: pdfFileName,
        url: origin,
        name: this.userid
      }
      this.loading = true
      getPdfAddress(origin,params).then(res => {
        this.loading = false
        if (res.code === 200) {
          let isText = this.isChinese(this.keyword)
          if(!this.keyword) {
            this.src = '/pdfview2/pdfjs-3.10.111-dist/web/viewer.html?file=' + res.url
            document.title = this.title
            return
          }
          if(this.keyword && isText) {
            if(this.keyword.length > 500) {
              this.keyword = this.keyword.slice(0,500)
            }
            this.src = '/pdfview2/pdfjs-3.10.111-dist/web/viewer.html?keyword=' + encodeURIComponent(this.keyword) + '&file=' + res.url
            document.title = this.title
          } else {
            let query = {
              pid: this.keyword
            }
            this.loading = true
            getKeywordFromPid(origin,query).then(response => {
              this.loading = false
              // if (response.code === 200) {
                // console.log(response)
                let resResult = JSON.parse(response)
                let queryText = ""
                if(resResult.length) {
                  // queryText = resResult[0].content
                  // if(queryText.length > 500) {
                  //   queryText = queryText.slice(0,500)
                  // }
                  queryText = resResult.map((item) => {
                    if(item.content.length > 500) {
                      item.content = item.content.slice(0,500)
                    }
                    return item.content
                  }).join("|||")
                }
                // let queryTextNew = this.getStringBeforeFirstPunctuation(queryText)
                // this.src = '/pdfview2/pdfjs-3.10.111-dist/web/viewer.html?keyword=' + encodeURIComponent(this.addSpaceAfterAlphaNum(queryTextNew)) + '&file=' + res.url
                this.src = '/pdfview2/pdfjs-3.10.111-dist/web/viewer.html?keyword=' + encodeURIComponent(queryText) + '&file=' + res.url
                document.title = this.title
              // }
            }).catch(() => {
              this.loading = false
            })
          }
        }
      }).catch(() => {
        this.loading = false
      })
    },
    initTest() {
      const url = `http://10.5.113.80:9005/pdfview2/?pdf=1729740071705391104.pdf&userid=56NOE6vGSfzQPzDuGA6LJqxfNO/Zg0fb+KubAIeH9zQ=&title=关于修订《华夏基金管理有限公司员工培训管理办法》和下发《华夏基金管理有限公司员工教育培训工作实施细则》的通知&keyword=杠杆率高位|||积极应对|||快速攀升期`
      const newUrl = new URL(url.replace(/\+/g, '%2B'))
      const pdfFileName = newUrl.searchParams.get('pdf')
      this.userid = decrypt(newUrl.searchParams.get('userid'))
      this.title = newUrl.searchParams.get('title')
      this.keyword = newUrl.searchParams.get('keyword')
      const origin = newUrl.origin

      let isText = this.isChinese(this.keyword)
      if(!this.keyword) {
        this.src = '/pdfjs-3.10.111-dist/web/viewer.html?file=' + "/static/test1.pdf"
        document.title = this.title
        return
      }
      if(this.keyword && isText) {
        if(this.keyword.length > 500) {
          this.keyword = this.keyword.slice(0,500)
        }
        document.title = this.title
        // this.src= '/pdfjs-4.4.168-dist/web/viewer.html?keyword=' + encodeURIComponent(this.addSpaceAfterAlphaNum(queryText)) + '&file=' + "/static/test.pdf"
        this.src= '/pdfjs-3.10.111-dist/web/viewer.html?keyword=' + encodeURIComponent(this.keyword) + '&file=' + "/static/test2.pdf"
      }
      let resResult=[{content:"111wo"},{content:"222ni"}]
      let queryText=""
      queryText = resResult.map((item) => {
        if(item.content.length > 500) {
          item.content = item.content.slice(0,500)
        }
        return item.content
      }).join("|||")
      console.log(queryText)
    },
    isChinese(str) {
      return /[\u4E00-\u9FFF]/.test(str);
    },
    getStringBeforeFirstPunctuation(str) {
      const punctuationRegex = /[，。？！、：]/;
      const match = str.match(punctuationRegex);
      if (match) {
        const punctuationIndex = str.indexOf(match[0]);
        return str.slice(0, punctuationIndex);
      }
      return str;
    },
    getThreeChineseChars(inputStr) {
      var pattern = /([\u4e00-\u9fff]{3})/g;
      var match = pattern.exec(inputStr);
      if (match) {
        return match[1];  // 返回第一个匹配的三个连续汉字
      } else {
        return "";  // 如果没有找到三个连续的汉字，返回null
      }
    },
    addSpaceAfterAlphaNum(str) {
      let result = str;
      const reg1 = /([a-zA-Z]+)/g;
      const reg2 = /([0-9.-]+)/g;
      const reg3 = /(\d+[a-zA-Z]+|[a-zA-Z]+\d+)/g;
      if(reg1.test(result)) {
        result = result.replace(reg1, ' $1 ');
      }
      if(reg2.test(result)) {
        if(result.includes("：") || result.includes("%")) {
          result = result.replace(reg2, ' $1');
        } else if(/^\d/.test(result)) {
          result = result.replace(reg2, '$1 ');
        } else if(reg3.test(result)) {
          result = result.replace(reg3, ' $1 ');
        } else {
          result = result.replace(reg2, ' $1 ');
        }
      }
      return result;
    },
    initPdf(url) {
      let that = this
      this.loading = true
      var xhr = new XMLHttpRequest();
      xhr.responseType = 'blob';
      xhr.open('GET', url, true);
      xhr.send();
      xhr.onload = function() {
        var blob = xhr.response;
        // 对blob进行处理
        new PreviewPdf({
          urlPdf: url,
          blob,
          docTitle: that.title,
          isAddWatermark: false, // 是否需要添加水印
          watermark: { // watermark必填 里面可以不填
            type: 'text',
            text: that.userid
          }
        })
        setTimeout(() => {
          that.loading = false
        }, 1000);
      };
      xhr.onerror = function() {
        that.loading = false
        that.$message({
          type: 'error',
          message: '解析失败'
        });
      };
    },
  },
};
</script>
<style>
</style>
