//= require_tree ./templates

(function(window, document, wysihtml5) {
  var config = null

  var Editor = function(el, _config) {
    config          = _config
    var _this       = this
    this.$el        = $(el)
    this.$textarea  = this.$el.find('textarea')
    this.policy     = this.$el.data('policy')

    this.addToolbar()
    this.attachEditor()
  }

  Editor.prototype.addToolbar = function() {
    var template = JST['active_admin/editor/templates/toolbar']({
      id: this.$el.attr('id') + '-toolbar'
    })

    this.$toolbar = $(template)

    if (config.uploads_enabled) {
      var _this = this
      this.$toolbar.find('input.uploadable').each(function() {
        _this.addUploader(this)
      })
    }

    this.$el.find('.wrap').prepend(this.$toolbar)
  }

  Editor.prototype.addUploader = function(input) {
    var $input = $(input)

    var template = JST['active_admin/editor/templates/uploader']({ spinner: config.spinner })
    var $uploader = $(template)

    var $dialog = $input.closest('[data-wysihtml5-dialog]')
    $dialog.append($uploader)

    var _this = this
    $uploader.find('input:file').on('change', function() {
      $input.val('')
      _this.upload(this.files[0], function(location) {
        $input.val(location)
      })
    })
  }

  Editor.prototype.attachEditor = function() {
    this.editor = new wysihtml5.Editor(this.$textarea.attr('id'), {
      toolbar: this.$toolbar.attr('id'),
      stylesheets: config.stylesheets,
      parserRules: config.parserRules
    })
  }

  Editor.prototype.uploading = function(uploading) {
    this._uploading = uploading
    this.$el.toggleClass('uploading', this._uploading)
    return this._uploading
  }

  Editor.prototype.upload = function(file, callback) {
    var _this = this
    _this.uploading(true)

    var xhr = new XMLHttpRequest()
      , fd = new FormData()
      , key = config.storage_dir + '/' + Date.now().toString() + '-' + file.name

    fd.append('key', key)
    fd.append('AWSAccessKeyId', config.aws_access_key_id)
    fd.append('acl', 'public-read')
    fd.append('policy', this.policy.document)
    fd.append('signature', this.policy.signature)
    fd.append('Content-Type', file.type)
    fd.append('file', file)

    xhr.upload.addEventListener('progress', function(e) {
      _this.loaded   = e.loaded
      _this.total    = e.total
      _this.progress = e.loaded / e.total
    }, false)

    xhr.onreadystatechange = function() {
      if (xhr.readyState != 4) { return }
      _this.uploading(false)
      callback(xhr.getResponseHeader('Location'))
    }

    xhr.open('POST', 'https://' + config.s3_bucket + '.s3.amazonaws.com', true)
    xhr.send(fd)

    return xhr
  }

  window.Editor = Editor
})(window, document, wysihtml5)