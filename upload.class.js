var Westsworld = (Westsworld == null)? {} : Westsworld;

Westsworld.Upload = Class.create({
	version: '0.3',
	
	initialize: function(options) {
		this.setOptions(options);
		
		console.log('initialize called');
		
		this.setup();
	},
	
	setup: function() {
		console.log('setup called');
		
		if(this.hasOption('formId') && this.getOption('formId') != null) {
			// fetches the form object
			this.oldFormObj = $(this.getOption('formId'));
			this.oldFormObj.hide();
			
			// initializes the "forms" placeholder
			this.forms = [];
			
			// creates the form
			this.createForm(this.oldFormObj);
			
			// connects the upload _started_ event
			document.observe('westsworld:components:upload:started', function(event) {
				console.log('"westsworld:components:upload:started" caught!');

				// takes the form id from the event parameters				
				var formId = event.memo.formId;
				
				// hides the form object, shows a uploading text
				this.showUploading(formId);
				
				// adds a new form, so the user can keep uploading
				this.createForm(formId);
				
				// calls submit on the form
				$(formId).submit();
				
				//this.createForm();
			}.bind(this));
			
			// connects the upload _done_ event
			document.observe('westsworld:components:upload:ended', function(event) {
				console.log('"westsworld:components:upload:ended" caught!');
				
				this.showUploadDone(event.memo.formId);
			}.bind(this));
		}
		else {
			alert('not properly initialized. Please supply a formId in the options hash');
		}
	},
	
	/**
	 *	Creates the form with upload fields and other contents
	 *	@param previousObj 					the object to add our form after. (e.g. the original form)
	 */
	createForm: function(previousObj) {
		// creates the new iframe
		var frameId = this._createIFrame();
		// creates the new form
		var formId = this._createForm(frameId, previousObj);
		
		this._createFormFields(formId, frameId);
	},
	
	/** 
	 *	Creates a form to upload the data from.
	 *	@param iframeId 						the iframe id to connect our form to (send the post to)
	 *	@param previousObj 					the object to add our form after. (e.g. the original form)
	 *	@return the created form's id.
	 */
	_createForm: function(iframeId, previousObj) {
		// creates the form template
		var formTemplate = new Template('<form id="#{formId}" action="#{action}" method="#{method}" enctype="#{enctype}" target="#{iframeId}></form>');
		
		// creates the form id, based on the actual form's name and a timestamp
		var formId = 'form_for_'+this.getOption('formId')+'_'+new Date().getTime();
		
		// creates the new form
		var formObj = formTemplate.evaluate({
			formId: formId,
			action: this.oldFormObj.action,
			enctype: this.oldFormObj.enctype,
			method: this.oldFormObj.method,
			iframeId: iframeId
		});
		
		// inserts the new form after the previous object.
		Element.insert($(previousObj),{'after': formObj});
		
		return formId;
	},
	
	
	/**
	 *	Creates an iframe to use for upload.
	 *	@return the id of the iframe created.
	 */
	_createIFrame: function() {
		// creates the frame template
		var iframeTemplate = new Template('<iframe id="#{iframeId}" name="#{iframeName}" style="display: none;"></iframe>');
		
		// creates the frame id, based on the actual form's name and timestamp
		var iframeId = 'iframe_for_'+this.getOption('formId')+'_'+new Date().getTime();
		
		Element.insert(this.oldFormObj, {'after': iframeTemplate.evaluate({
				iframeId: iframeId,
				iframeName: iframeId
			})
		});
		
		return iframeId;
	},
	
	/**
	 *	Creates the form fields
	 *	@param formId 				the id of the form to add the fields to
	 *	@param frameId 				the id of the iframe to send the data to.
	 */
	_createFormFields: function(formId, frameId) {
		var fieldTemplate = new Template('<div><input type="#{type}" name="#{name}" value="#{value}" id="#{id}" /></div>');
		
		// starts to add the fields to the form
		var inputObjectArray = this.oldFormObj.getInputs();
		var inputLength = inputObjectArray.length;
		
		for(var i = 0; i < inputLength; i++) {
			var inputObj = inputObjectArray[i];
			
			// determines if the given input object field should be added
			var addField = false;
			if(inputObj.type.toLowerCase() == 'file') {
				addField = true;
			}
			else {
				if(this.getOption('includeFields')) {
					addField = true;
				}
			}
			
			// adds the field (only supports input fields atm!
			if(addField && this._isFieldValid(inputObj)) {
				var fieldId = 'field_for_'+inputObj.name+'_'+new Date().getTime();
				
				var fieldObj = fieldTemplate.evaluate({
					type: inputObj.type,
					name: inputObj.name,
					value: inputObj.value,
					id: fieldId
				});
				
				Element.insert(formId, {'bottom':fieldObj});
				
				// adds an onchange event to the file upload object
				if(inputObj.type == 'file') {
					Event.observe(fieldId, 'change', function(event) {
						document.fire('westsworld:components:upload:started', {formId: formId});
					});
				}
			}
		}
		
		// adds a hidden field, that holds the form id information.
		// this should be sent back from the upload script.
		var formIdObjField = fieldTemplate.evaluate({
			type: 'hidden',
			name: 'javascript_formid',
			value: formId,
		});
		
		Element.insert(formId, {'bottom':formIdObjField});
	},
	
	/**
	 *	Tests if the given field object is "valid".
	 *
	 *	So far "valid" means fields of tagName is "INPUT" and
	 *	the type is either "file", "hidden" or "text".
	 *	@param obj 				the field object to test
	 *	@return true if valid, else false.
	 */
	_isFieldValid: function(obj) {
		var isValid = false;
		
		if(obj.tagName.toLowerCase() == 'input') {
			var type = obj.type.toLowerCase();
			
			if(type == 'file' || type == 'hidden') {
				isValid = true;
			}
		}
		
		return isValid;
	},
	
	
	/**
	 *	Shows a nice uploading text.
	 *	@param formId 				the id of the form to "replace" with the uploading text
	 */
	showUploading: function(formId) {
		// hides the currently not hidden fields
		this.hideFormFields(formId);
		
		// creates the template to show
		var uploadingTemplate = new Template('<div>#{text}</div>');
		
		// inserts the uploadingTextTemplate into the current form
		$(formId).insert(
			uploadingTemplate.evaluate({
				text: this.getOption('uploadingText')}
			)
		);
	},
	
	
	/**
	 *	Shows an "upload done" text
	 *	@param formId 				the form id to show the "done" text for.
	 */
	showUploadDone: function(formId) {
		// hides the currently not hidden fields
		this.hideFormFields(formId);
		
		// creates the upload done template.
		var uploadDoneTemplate = new Template('<div id="#{id}" style="display: none" class="ajax-upload-message">#{text}</div>');
		
		var id = 'uploadDone_field_'+new Date().getTime();
		
		// inserts the uploadDoneTemplate into the current form
		$(formId).insert(
			uploadDoneTemplate.evaluate({
				id: id,
				text: this.getOption('uploadDoneText')
			})
		);
		
		Effect.Appear(id, {
			afterFinish: function() {
				Effect.Fade(id, {delay: '5'});
			}
		});
	},
	
	/**
	 *	Hides the given forms fields.
	 *	@param formId 			the id of the form, which fields needs to be hidden.
	 */
	hideFormFields: function(formId) {
		// fetches the formObj
		var formObj = $(formId);
		
		// if there is a form object, fetch the children and hide them
		if(formObj != undefined) {
			$A(formObj.children).each(function(item) {
				Element.hide(item);
			});
		}
	},
	
	/**
	 *	Sets the options
	 *	@param options 				the options to set.
	 */
	setOptions: function(options) {
		this.options = {
			formId: null,
			includeFields: true
		};
		
		// adds the options to the options hash, if any are present
		if(options) {
			// sets the form id to use as a base form (get the information from)
			if(options.formId != undefined) {
				this.options.formId = options.formId;
			}
			// sets if the current fields in the form should be sent to the upload backend as well
			if(options.includeFields != undefined) {
				this.options.includeFields = options.includeFields;
			}
			// sets the uploading text
			if(options.uploadingText != undefined) {
				this.options.uploadingText = options.uploadingText;
			}
			else {
				this.options.uploadingText = 'Uploading File...';
			}
			// sets the uploading done text.
			if(options.uploadingText != undefined) {
				this.options.uploadDoneText = options.uploadDoneText;
			}
			else {
				this.options.uploadDoneText = 'Upload Done!';
			}
			
		}
	},
	
	/** 
	 *	Tests if the given key exists
	 *	@param key 				the key to test for
	 *	@return true if the option exist else false
	 */
	hasOption: function(key) {
		return this.options[key] != undefined;
	},
	
	/** 
	 *	Fetches an option, using the given key.
	 *	@param key 				the key to fetch the option for
	 *	@return the option found
	 */
	getOption: function(key) {
		return this.options[key];
	}
});
